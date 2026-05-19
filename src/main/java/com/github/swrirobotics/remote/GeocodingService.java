// *****************************************************************************
//
// Copyright (c) 2015, Southwest Research Institute® (SwRI®)
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions are met:
//     * Redistributions of source code must retain the above copyright
//       notice, this list of conditions and the following disclaimer.
//     * Redistributions in binary form must reproduce the above copyright
//       notice, this list of conditions and the following disclaimer in the
//       documentation and/or other materials provided with the distribution.
//     * Neither the name of Southwest Research Institute® (SwRI®) nor the
//       names of its contributors may be used to endorse or promote products
//       derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
// AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED. IN NO EVENT SHALL Southwest Research Institute® BE LIABLE 
// FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR 
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER 
// CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT 
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY 
// OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
// DAMAGE.
//
// *****************************************************************************

package com.github.swrirobotics.remote;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.swrirobotics.config.ConfigService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;

@Service
public class GeocodingService {
    private static final String AMAP_REVERSE_GEOCODING_URL = "https://restapi.amap.com/v3/geocode/regeo";
    private static final double GCJ02_A = 6378245.0;
    private static final double GCJ02_EE = 0.00669342162296594323;

    @Autowired
    private ConfigService myConfigService;

    private static final Logger myLogger = LoggerFactory.getLogger(GeocodingService.class);
    private final HttpClient httpClient = HttpClient.newBuilder()
                                                    .connectTimeout(Duration.ofSeconds(5))
                                                    .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String getLocationName(double latitudeDeg, double longitudeDeg) {
        myLogger.trace("Reverse geocoding lat/long (" + latitudeDeg + ", " + longitudeDeg + ")");
        String key = myConfigService.getConfiguration().getAmapApiKey();
        if (key == null || key.isBlank()) {
            myLogger.warn("Amap API Key has not been set.");
            return null;
        }

        double[] gcj02Point = wgs84ToGcj02(longitudeDeg, latitudeDeg);
        URI uri = buildReverseGeocodingUri(key, gcj02Point[0], gcj02Point[1]);

        try {
            HttpRequest request = HttpRequest.newBuilder(uri)
                                             .timeout(Duration.ofSeconds(10))
                                             .GET()
                                             .build();
            HttpResponse<String> response = httpClient.send(
                    request,
                    HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8)
            );
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                myLogger.warn("Amap reverse geocoding returned HTTP {} for ({}, {})",
                              response.statusCode(), latitudeDeg, longitudeDeg);
                return "(Unknown)";
            }

            JsonNode root = objectMapper.readTree(response.body());
            if (!"1".equals(root.path("status").asText())) {
                myLogger.warn("Amap reverse geocoding failed for ({}, {}): {} ({})",
                              latitudeDeg,
                              longitudeDeg,
                              root.path("info").asText("Unknown error"),
                              root.path("infocode").asText(""));
                return "(Unknown)";
            }

            String formattedAddress = root.path("regeocode").path("formatted_address").asText("");
            if (!formattedAddress.isEmpty()) {
                myLogger.debug("Location for ({}, {}): {}", latitudeDeg, longitudeDeg, formattedAddress);
                return formattedAddress;
            }
            myLogger.debug("Amap reverse geocoding found no address for ({}, {})", latitudeDeg, longitudeDeg);
        }
        catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            myLogger.error("Amap reverse geocoding was interrupted for (" + latitudeDeg +
                           ", " + longitudeDeg + "):", e);
        }
        catch (IOException | IllegalArgumentException e) {
            myLogger.error("Amap reverse geocoding failed for (" + latitudeDeg +
                           ", " + longitudeDeg + "):", e);
        }

        return "(Unknown)";
    }

    private URI buildReverseGeocodingUri(String key, double longitudeDeg, double latitudeDeg) {
        String location = String.format(Locale.US, "%.8f,%.8f", longitudeDeg, latitudeDeg);
        String query = "key=" + encodeQueryValue(key) +
                       "&location=" + encodeQueryValue(location) +
                       "&output=json" +
                       "&extensions=base" +
                       "&radius=1000";
        return URI.create(AMAP_REVERSE_GEOCODING_URL + "?" + query);
    }

    private String encodeQueryValue(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private double[] wgs84ToGcj02(double longitudeDeg, double latitudeDeg) {
        if (isOutsideChina(longitudeDeg, latitudeDeg)) {
            return new double[] { longitudeDeg, latitudeDeg };
        }

        double deltaLat = transformLat(longitudeDeg - 105.0, latitudeDeg - 35.0);
        double deltaLon = transformLon(longitudeDeg - 105.0, latitudeDeg - 35.0);
        double radLat = latitudeDeg / 180.0 * Math.PI;
        double magic = Math.sin(radLat);
        magic = 1 - GCJ02_EE * magic * magic;
        double sqrtMagic = Math.sqrt(magic);
        deltaLat = (deltaLat * 180.0) / ((GCJ02_A * (1 - GCJ02_EE)) / (magic * sqrtMagic) * Math.PI);
        deltaLon = (deltaLon * 180.0) / (GCJ02_A / sqrtMagic * Math.cos(radLat) * Math.PI);
        return new double[] { longitudeDeg + deltaLon, latitudeDeg + deltaLat };
    }

    private boolean isOutsideChina(double longitudeDeg, double latitudeDeg) {
        return longitudeDeg < 72.004 ||
               longitudeDeg > 137.8347 ||
               latitudeDeg < 0.8293 ||
               latitudeDeg > 55.8271;
    }

    private double transformLat(double longitudeDeg, double latitudeDeg) {
        double ret = -100.0 +
                     2.0 * longitudeDeg +
                     3.0 * latitudeDeg +
                     0.2 * latitudeDeg * latitudeDeg +
                     0.1 * longitudeDeg * latitudeDeg +
                     0.2 * Math.sqrt(Math.abs(longitudeDeg));
        ret += (20.0 * Math.sin(6.0 * longitudeDeg * Math.PI) +
                20.0 * Math.sin(2.0 * longitudeDeg * Math.PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(latitudeDeg * Math.PI) +
                40.0 * Math.sin(latitudeDeg / 3.0 * Math.PI)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(latitudeDeg / 12.0 * Math.PI) +
                320.0 * Math.sin(latitudeDeg * Math.PI / 30.0)) * 2.0 / 3.0;
        return ret;
    }

    private double transformLon(double longitudeDeg, double latitudeDeg) {
        double ret = 300.0 +
                     longitudeDeg +
                     2.0 * latitudeDeg +
                     0.1 * longitudeDeg * longitudeDeg +
                     0.1 * longitudeDeg * latitudeDeg +
                     0.1 * Math.sqrt(Math.abs(longitudeDeg));
        ret += (20.0 * Math.sin(6.0 * longitudeDeg * Math.PI) +
                20.0 * Math.sin(2.0 * longitudeDeg * Math.PI)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(longitudeDeg * Math.PI) +
                40.0 * Math.sin(longitudeDeg / 3.0 * Math.PI)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(longitudeDeg / 12.0 * Math.PI) +
                300.0 * Math.sin(longitudeDeg / 30.0 * Math.PI)) * 2.0 / 3.0;
        return ret;
    }
}
