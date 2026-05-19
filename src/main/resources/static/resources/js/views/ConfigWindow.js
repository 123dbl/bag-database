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

Ext.define('BagDatabase.views.ConfigWindow', {
    extend: 'Ext.window.Window',
    alias: 'widget.configWindow',
    layout: 'fit',
    title: 'Bag Database Configuration',
    width: 760,
    minWidth: 680,
    maxHeight: 720,
    constrainHeader: true,
    items: [{
        xtype: 'form',
        autoScroll: true,
        bodyPadding: 8,
        itemId: 'configForm',
        url: 'config/get',
        defaultType: 'textfield',
        defaults: {
            labelWidth: 180,
            width: '100%'
        },
        items: [{
            fieldLabel: 'Bag Path',
            name: 'bagPath'
        }, {
            fieldLabel: 'Docker Host',
            name: 'dockerHost'
        }, {
            fieldLabel: 'JDBC Driver',
            name: 'driver',
            allowBlank: false
        }, {
            fieldLabel: 'JDBC URL',
            name: 'jdbcUrl',
            allowBlank: false
        }, {
            fieldLabel: 'JDBC Username',
            name: 'jdbcUsername'
        }, {
            fieldLabel: 'JDBC Password',
            inputType: 'password',
            name: 'jdbcPassword'
        }, {
            fieldLabel: 'Google API Key',
            name: 'googleApiKey'
        }, {
            fieldLabel: 'Temporary Script Path',
            name: 'scriptTmpPath'
        }, {
            fieldLabel: 'Remove Bags from the Database on Deletion',
            name: 'removeOnDeletion',
            xtype: 'checkboxfield',
            uncheckedValue: false,
            inputValue: true
        }, {
            xtype: 'fieldset',
            title: 'Map Display',
            defaultType: 'textfield',
            defaults: {
                labelWidth: 180,
                width: '100%'
            },
            items: [{
                xtype: 'displayfield',
                fieldLabel: 'Coordinate System',
                value: 'Base map: GCJ02; GPS tracks are converted from WGS84 automatically.'
            }, {
                fieldLabel: 'Use Tile Map',
                name: 'useMapQuest',
                xtype: 'checkboxfield',
                uncheckedValue: false,
                inputValue: true
            }, {
                fieldLabel: 'Normal Tile URL',
                name: 'tileMapUrl',
                itemId: 'tileMapUrlField',
                emptyText: BAG_DATABASE_AMAP_NORMAL_TILE_URL,
                inputAttrTpl: 'spellcheck="false"'
            }, {
                fieldLabel: 'Satellite Tile URL',
                name: 'satelliteTileMapUrl',
                itemId: 'satelliteTileMapUrlField',
                emptyText: BAG_DATABASE_AMAP_SATELLITE_TILE_URL,
                inputAttrTpl: 'spellcheck="false"'
            }, {
                xtype: 'container',
                layout: 'hbox',
                defaults: {
                    xtype: 'button',
                    margin: '0 8 8 0'
                },
                items: [{
                    text: 'Use Amap Normal',
                    handler: function(button) {
                        button.up('form').down('#tileMapUrlField').setValue(BAG_DATABASE_AMAP_NORMAL_TILE_URL);
                    }
                }, {
                    text: 'Use Amap Satellite',
                    handler: function(button) {
                        button.up('form').down('#satelliteTileMapUrlField').setValue(BAG_DATABASE_AMAP_SATELLITE_TILE_URL);
                    }
                }]
            }, {
                fieldLabel: 'Tile Width (px)',
                name: 'tileWidthPx',
                xtype: 'numberfield',
                minValue: 1
            }, {
                fieldLabel: 'Tile Height (px)',
                name: 'tileHeightPx',
                xtype: 'numberfield',
                minValue: 1
            }]
        }, {
            fieldLabel: 'Vehicle Name Topics',
            name: 'vehicleNameTopics'
        }, {
            fieldLabel: 'Metadata Topics',
            name: 'metadataTopics'
        }, {
            fieldLabel: 'GPS Topics',
            name: 'gpsTopics'
        }, {
            fieldLabel: 'Open With URLs',
            name: 'openWithUrls',
            itemId: 'openWithUrlsField',
            xtype: 'textarea',
            height: 80,
            readOnly: true,
            submitValue: false
        }],
        buttons: [{
            text: 'Save',
            formBind: true,
            disabled: true,
            handler: function() {
                var form, params;
                form = this.up('form').getForm();
                params = {};
                params[csrfName] = csrfToken;
                if (form.isValid()) {
                    form.submit({
                        params: params,
                        success: function() {
                            Ext.Msg.alert('Success', 'Configuration has been updated.');
                        },
                        failure: function() {
                            Ext.Msg.alert('Failure', 'Error saving configuration.');
                        }
                    });
                }
            }
        }]
    }],
    initComponent: function() {
        this.callParent(arguments);
        var configForm = this.down('#configForm');
        configForm.getForm().baseParams = this.params;

        this.down('#configForm').load({
            success: function(form, action) {
                var data, openWithField, satelliteField, tileField;
                tileField = form.findField('tileMapUrl');
                satelliteField = form.findField('satelliteTileMapUrl');
                openWithField = form.findField('openWithUrls');
                data = action && action.result ? action.result.data : null;
                if (tileField && tileField.getValue() === BAG_DATABASE_LEGACY_STAMEN_TILE_URL) {
                    tileField.setValue(BAG_DATABASE_AMAP_NORMAL_TILE_URL);
                }
                if (satelliteField && !satelliteField.getValue()) {
                    satelliteField.setValue(BAG_DATABASE_AMAP_SATELLITE_TILE_URL);
                }
                if (openWithField && data && data.openWithUrls) {
                    openWithField.setValue(JSON.stringify(data.openWithUrls, null, 2));
                }
            }
        });
    }
});
