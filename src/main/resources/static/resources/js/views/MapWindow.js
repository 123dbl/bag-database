// *****************************************************************************
//
// Copyright (c) 2020, Southwest Research Institute® (SwRI®)
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

var BAG_DATABASE_GCJ02_A = 6378245.0;
var BAG_DATABASE_GCJ02_EE = 0.00669342162296594323;

Ext.define('BagDatabase.views.MapWindow', {
    extend: 'Ext.window.Window',
    alias: 'widget.mapWindow',
    cls: 'bag-map-window',
    width: 600,
    height: 600,
    minWidth: 360,
    minHeight: 300,
    map: null,
    baseLayers: null,
    activeBaseLayer: 'normal',
    vectorLayers: [],
    constrainHeader: true,
    maximizable: true,
    resizable: true,
    listeners: {
        afterrender: function(win) {
            win.initializeMap();
        },
        resize: function(win) {
            win.scheduleMapUpdate();
        },
        move: function(win) {
            win.scheduleMapUpdate();
        },
        maximize: function(win) {
            win.scheduleMapUpdate();
        },
        restore: function(win) {
            win.scheduleMapUpdate();
        }
    },
    initComponent: function() {
        var me, layerGroup, normalLayerText;
        me = this;
        layerGroup = Ext.id(null, 'bag-map-base-layer-');
        normalLayerText = me.getNormalBaseLayerText();

        me.tbar = [{
            xtype: 'tbtext',
            itemId: 'projectionNotice',
            text: '底图: GCJ02，轨迹已从 WGS84 自动转换'
        }, '->', {
            xtype: 'button',
            itemId: 'baseLayerButton',
            text: normalLayerText,
            iconCls: 'map-icon',
            menu: {
                items: [{
                    text: normalLayerText,
                    checked: true,
                    group: layerGroup,
                    handler: function() {
                        me.setBaseLayer('normal');
                    }
                }, {
                    text: '高德卫星底图',
                    checked: false,
                    group: layerGroup,
                    handler: function() {
                        me.setBaseLayer('satellite');
                    }
                }]
            }
        }];

        if (typeof useBing !== 'undefined' && useBing && typeof bingKey !== 'undefined' && bingKey !== '') {
            me.tbar[2].menu.items.push({
                text: 'Bing Aerial',
                checked: false,
                group: layerGroup,
                handler: function() {
                    me.setBaseLayer('bing');
                }
            });
        }

        this.callParent(arguments);
    },
    initializeMap: function() {
        var controls, layers, target;
        layers = [];
        this.baseLayers = {};

        if (this.isTileMapEnabled()) {
            this.baseLayers.normal = this.createAmapTileLayer(this.getNormalTileUrl(), true);
            this.baseLayers.satellite = this.createAmapTileLayer(this.getSatelliteTileUrl(), false);
            layers.push(this.baseLayers.normal);
            layers.push(this.baseLayers.satellite);
        }

        if (typeof useBing !== 'undefined' && useBing && typeof bingKey !== 'undefined' && bingKey !== '') {
            this.baseLayers.bing = new ol.layer.Tile({
                visible: false,
                source: new ol.source.BingMaps({
                    crossOrigin: 'anonymous',
                    key: bingKey,
                    imagerySet: 'Aerial',
                    maxZoom: 19
                })
            });
            layers.push(this.baseLayers.bing);
        }

        controls = ol.control.defaults();
        if (ol.control.FullScreen) {
            controls = controls.extend([new ol.control.FullScreen()]);
        }

        target = this.getId() + '-innerCt';
        this.map = new ol.Map({
            target: target,
            layers: layers,
            controls: controls,
            view: new ol.View({
                center: ol.proj.fromLonLat([116.397389, 39.908722]),
                zoom: 4
            })
        });
        this.scheduleMapUpdate();
    },
    createAmapTileLayer: function(url, visible) {
        return new ol.layer.Tile({
            visible: visible,
            source: new ol.source.XYZ({
                maxZoom: 18,
                tileSize: [this.getTileWidth(), this.getTileHeight()],
                url: url
            })
        });
    },
    isTileMapEnabled: function() {
        return typeof useTileMap === 'undefined' || useTileMap === true;
    },
    getNormalTileUrl: function() {
        if (typeof tileMapUrl === 'string' && tileMapUrl.length > 0 &&
                tileMapUrl !== BAG_DATABASE_LEGACY_STAMEN_TILE_URL) {
            return tileMapUrl;
        }
        return BAG_DATABASE_AMAP_NORMAL_TILE_URL;
    },
    getSatelliteTileUrl: function() {
        if (typeof satelliteTileMapUrl === 'string' && satelliteTileMapUrl.length > 0) {
            return satelliteTileMapUrl;
        }
        return BAG_DATABASE_AMAP_SATELLITE_TILE_URL;
    },
    getNormalBaseLayerText: function() {
        return this.getNormalTileUrl() === BAG_DATABASE_AMAP_NORMAL_TILE_URL ?
            '高德普通底图' : '普通底图';
    },
    getTileWidth: function() {
        return typeof tileWidthPx === 'number' && tileWidthPx > 0 ? tileWidthPx : 256;
    },
    getTileHeight: function() {
        return typeof tileHeightPx === 'number' && tileHeightPx > 0 ? tileHeightPx : 256;
    },
    getBaseLayerText: function(layerName) {
        if (layerName === 'satellite') {
            return '高德卫星底图';
        }
        if (layerName === 'bing') {
            return 'Bing Aerial';
        }
        return this.getNormalBaseLayerText();
    },
    setBaseLayer: function(layerName) {
        var button, layers, name;
        layers = this.baseLayers || {};

        for (name in layers) {
            if (layers.hasOwnProperty(name)) {
                layers[name].setVisible(name === layerName);
            }
        }

        this.activeBaseLayer = layerName;
        button = this.down('#baseLayerButton');
        if (button) {
            button.setText(this.getBaseLayerText(layerName));
        }
        this.scheduleMapUpdate();
    },
    scheduleMapUpdate: function() {
        if (this.map) {
            Ext.defer(function() {
                if (this.map) {
                    this.map.updateSize();
                }
            }, 50, this);
        }
    },
    createCircleFeature: function(point, name, color) {
        var feature = new ol.Feature({
            geometry: new ol.geom.Point(point),
            name: name
        });
        feature.setStyle(new ol.style.Style({
            image: new ol.style.Circle({
                fill: new ol.style.Fill({
                    color: color
                }),
                stroke: new ol.style.Stroke({
                    color: 'rgb:(0,0,0)'
                }),
                radius: 4
            })
        }));
        return feature;
    },
    isOutsideChina: function(lon, lat) {
        return lon < 72.004 || lon > 137.8347 || lat < 0.8293 || lat > 55.8271;
    },
    transformGcjLat: function(x, y) {
        var pi, ret;
        pi = Math.PI;
        ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y +
            0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * pi) +
            20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(y * pi) +
            40.0 * Math.sin(y / 3.0 * pi)) * 2.0 / 3.0;
        ret += (160.0 * Math.sin(y / 12.0 * pi) +
            320 * Math.sin(y * pi / 30.0)) * 2.0 / 3.0;
        return ret;
    },
    transformGcjLon: function(x, y) {
        var pi, ret;
        pi = Math.PI;
        ret = 300.0 + x + 2.0 * y + 0.1 * x * x +
            0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
        ret += (20.0 * Math.sin(6.0 * x * pi) +
            20.0 * Math.sin(2.0 * x * pi)) * 2.0 / 3.0;
        ret += (20.0 * Math.sin(x * pi) +
            40.0 * Math.sin(x / 3.0 * pi)) * 2.0 / 3.0;
        ret += (150.0 * Math.sin(x / 12.0 * pi) +
            300.0 * Math.sin(x / 30.0 * pi)) * 2.0 / 3.0;
        return ret;
    },
    wgs84ToGcj02: function(point) {
        var dLat, dLon, gcjLat, gcjLon, lat, lon, magic, pi, radLat, sqrtMagic;
        lon = Number(point[0]);
        lat = Number(point[1]);

        if (!isFinite(lon) || !isFinite(lat)) {
            return null;
        }
        if (this.isOutsideChina(lon, lat)) {
            return [lon, lat];
        }

        pi = Math.PI;
        dLat = this.transformGcjLat(lon - 105.0, lat - 35.0);
        dLon = this.transformGcjLon(lon - 105.0, lat - 35.0);
        radLat = lat / 180.0 * pi;
        magic = Math.sin(radLat);
        magic = 1 - BAG_DATABASE_GCJ02_EE * magic * magic;
        sqrtMagic = Math.sqrt(magic);
        dLat = (dLat * 180.0) / ((BAG_DATABASE_GCJ02_A * (1 - BAG_DATABASE_GCJ02_EE)) /
            (magic * sqrtMagic) * pi);
        dLon = (dLon * 180.0) / (BAG_DATABASE_GCJ02_A / sqrtMagic *
            Math.cos(radLat) * pi);
        gcjLat = lat + dLat;
        gcjLon = lon + dLon;
        return [gcjLon, gcjLat];
    },
    toMapCoordinate: function(point) {
        var gcjPoint;
        gcjPoint = this.wgs84ToGcj02(point);
        return gcjPoint ? ol.proj.fromLonLat(gcjPoint) : null;
    },
    addRoute: function(points) {
        if (points.length == 0) {
            return;
        }
        var me, tmpPoints, routeFeature, startFeature, endFeature, source, layer;
        me = this;
        tmpPoints = [];
        points.forEach(function(point) {
            var mapPoint;
            mapPoint = me.toMapCoordinate(point);
            if (mapPoint) {
                tmpPoints.push(mapPoint);
            }
        });
        if (tmpPoints.length == 0) {
            return;
        }
        routeFeature = new ol.Feature({
            geometry: new ol.geom.LineString(tmpPoints),
            name: 'Bag Route'
        });
        routeFeature.setStyle(new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: 'rgb(255,0,0)',
                width: 2
            })
        }));
        startFeature = this.createCircleFeature(
            tmpPoints[0], 'Start Point', 'rgb(0,255,0)');
        endFeature = this.createCircleFeature(
            tmpPoints[tmpPoints.length-1], 'End Point', 'rgb(255,0,0)');
        source = new ol.source.Vector({
            features: [routeFeature, startFeature, endFeature]
        });
        layer = new ol.layer.Vector({
            source: source
        });
        this.map.addLayer(layer);
        this.vectorLayers.push(layer);
        this.map.getView().fit(source.getExtent(),
            this.map.getSize(),
            { minResolution: 0.29858214173896974 });
        this.scheduleMapUpdate();
    }
});
