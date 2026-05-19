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

var BAG_DATABASE_AMAP_NORMAL_TILE_URL = 'https://webrd01.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';
var BAG_DATABASE_AMAP_SATELLITE_TILE_URL = 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}';
var BAG_DATABASE_LEGACY_STAMEN_TILE_URL = 'http://{a-d}.tile.stamen.com/terrain/{z}/{x}/{y}.jpg';

/**
 * Starts the bag database application.
 */
function startApplication() {
    Ext.application({
        name: 'Bag Database',
        requires: [ 'BagDatabase.views.BagDatabaseViewport' ],
        autoCreateViewport: 'BagDatabase.views.BagDatabaseViewport',
        quickTips: true
    });
}

if (typeof window.bagGridDateRenderer !== 'function') {
    window.bagGridDateRenderer = Ext.util.Format.dateRenderer('n/j/Y H:i:s');
}

if (typeof window.parseBagDatabaseDate !== 'function') {
    window.parseBagDatabaseDate = function(value) {
        var date, fractionalMs, match, offset, offsetMinutes, timestamp;

        if (!value) {
            return null;
        }
        if (Ext.isDate(value)) {
            return value;
        }
        if (typeof value === 'number') {
            return new Date(value);
        }
        if (typeof value !== 'string') {
            return null;
        }
        if (/^\d+$/.test(value)) {
            return new Date(parseInt(value, 10));
        }

        match = value.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(?:([Zz]|[+-]\d{2}:?\d{2}))?$/);
        if (match) {
            fractionalMs = match[7] ? parseInt((match[7] + '000').slice(0, 3), 10) : 0;
            if (match[8]) {
                timestamp = Date.UTC(
                    parseInt(match[1], 10),
                    parseInt(match[2], 10) - 1,
                    parseInt(match[3], 10),
                    parseInt(match[4], 10),
                    parseInt(match[5], 10),
                    parseInt(match[6], 10),
                    fractionalMs
                );
                if (match[8] !== 'Z' && match[8] !== 'z') {
                    offset = match[8].replace(':', '');
                    offsetMinutes = (parseInt(offset.substr(1, 2), 10) * 60 +
                        parseInt(offset.substr(3, 2), 10)) * (offset.charAt(0) === '-' ? -1 : 1);
                    timestamp -= offsetMinutes * 60000;
                }
                return new Date(timestamp);
            }

            return new Date(
                parseInt(match[1], 10),
                parseInt(match[2], 10) - 1,
                parseInt(match[3], 10),
                parseInt(match[4], 10),
                parseInt(match[5], 10),
                parseInt(match[6], 10),
                fractionalMs
            );
        }

        date = new Date(value);
        return isNaN(date.getTime()) ? null : date;
    };
}

Ext.onReady(function() {
    // Set up our state provider before we start the app so we can reliably
    // restore our previous state.
    Ext.state.Manager.setProvider(new Ext.state.LocalStorageProvider());
    try {
        startApplication();
    }
    catch (e) {
        console.error('Failed to load Bag Database:');
        console.error(e);
    }
});
