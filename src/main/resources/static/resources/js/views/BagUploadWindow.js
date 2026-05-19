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

function isBagUploadActive(status) {
    return status === 'Uploading' || status === 'Processing';
}

function getBagUploadStore() {
    Ext.ns('BagDatabase.uploads');

    if (!BagDatabase.uploads.store) {
        BagDatabase.uploads.store = Ext.create('Ext.data.Store', {
            autoDestroy: false,
            fields: ['name', 'size', 'file', 'status', 'progress']
        });
    }

    return BagDatabase.uploads.store;
}

function addBagUploadFile(store, file) {
    store.add({
        file: file,
        name: file.name,
        size: file.size,
        status: 'Ready',
        progress: 0
    });
}

function setBagUploadState(item, status, progress) {
    var values;
    values = {
        status: status
    };

    if (typeof progress === 'number') {
        values.progress = progress;
    }

    if (item.get('status') !== values.status ||
        (typeof values.progress === 'number' && item.get('progress') !== values.progress)) {
        item.set(values);
        item.commit();
    }
}

Ext.define('BagDatabase.views.BagUploadWindow', {
    extend: 'Ext.window.Window',
    alias: 'widget.bagUploadWindow',
    layout: 'fit',
    title: 'Upload Bags',
    iconCls: 'bag-add-icon',
    width: 620,
    height: 400,
    constrainHeader: true,
    items: [{
        multiSelect: true,
        xtype: 'grid',
        store: getBagUploadStore(),
        columns: [{
            header: 'Name',
            dataIndex: 'name',
            flex: 2
        }, {
            header: 'Size',
            dataIndex: 'size',
            flex: 1,
            renderer: Ext.util.Format.fileSize
        }, {
            header: 'Status',
            dataIndex: 'status',
            flex: 1.15,
            renderer: function(value, metaData, record, rowIndex, colIndex, store) {
                var color;
                color = "grey";

                if (value === "Ready") {
                    color = "blue";
                } else if (value === "Uploading") {
                    color = "orange";
                } else if (value === "Processing") {
                    color = "orange";
                } else if (value === "Uploaded") {
                    color = "green";
                } else if (value && value.startsWith("Error")) {
                    color = "red";
                }
                metaData.tdStyle = 'color:' + color + ";";
                return Ext.String.htmlEncode(value || '');
            }
        }, {
            header: 'Progress',
            dataIndex: 'progress',
            width: 90,
            renderer: function(value, metaData, record, rowIndex, colIndex, store) {
                var progress, status;
                progress = typeof value === 'number' ? value : 0;
                status = record.get('status');

                if (status === 'Ready') {
                    return '';
                }

                return progress + '%';
            }
        }],

        viewConfig: {
            emptyText: 'Drop Files Here',
            deferEmptyText: false
        },

        listeners: {
            drop: { element: 'el', fn: 'drop' },
            dragstart: { element: 'el', fn: 'addDropZone' },
            dragenter: { element: 'el', fn: 'addDropZone' },
            dragover: { element: 'el', fn: 'addDropZone' },
            dragleave: { element: 'el', fn: 'removeDropZone' },
            dragexit: { element: 'el', fn: 'removeDropZone' },
        },

        noop: function(e) {
            e.stopEvent();
        },

        addDropZone: function(e) {
            if (!e.browserEvent.dataTransfer || Ext.Array.from(e.browserEvent.dataTransfer.types).indexOf('Files') === -1) {
                return;
            }

            e.stopEvent();

            this.addCls('drag-over');
        },

        removeDropZone: function(e) {
            var el = e.getTarget(),
              thisEl = this.getEl();

            e.stopEvent();

            if (el === thisEl.dom) {
                this.removeCls('drag-over');
                return;
            }

            while (el !== thisEl.dom && el && el.parentNode) {
                el = el.parentNode;
            }

            if (el !== thisEl.dom) {
                this.removeCls('drag-over');
            }
        },

        drop: function(e) {
            var store = this.up('grid').store;//Ext.getStore('bagUploadStore');
            e.stopEvent();
            Ext.Array.forEach(Ext.Array.from(e.browserEvent.dataTransfer.files), function(file) {
                if (!file.name.endsWith(".bag")) {
                    Ext.Msg.show({
                        title: 'Not a Bag File',
                        message: 'Only uploading .bag files is allowed.',
                        buttons: Ext.Msg.OK,
                        icon: Ext.Msg.WARN
                    });
                    return false;
                }
                addBagUploadFile(store, file);
            });
            this.removeCls('drag-over');
        },

        tbar: [{
            text: "Upload All",
            cls: 'x-btn-default-small',
            listeners: {
                'afterrender': function(field) {
                    field.removeCls('x-btn-default-toolbar-small');
                    field.btnInnerEl.removeCls('x-btn-inner-default-toolbar-small');
                    field.btnInnerEl.addCls('x-btn-inner-default-small');
                }
            },
            handler: function() {
                var grid, store, postDocument, path, storageId;
                grid = this.up('grid');
                store = grid.store;
                postDocument = grid.postDocument;
                path = grid.down('#targetPath').getRawValue();
                storageId = grid.down('#storageId').getRawValue();
                store.each(function(item) {
                    if (item.get('status') !== 'Uploaded' &&
                        !isBagUploadActive(item.get('status'))) {
                        setBagUploadState(item, 'Uploading', 0);
                        postDocument('bags/upload', item, path, storageId);
                    }
                });
            }
        }, {
            text: "Clear All",
            cls: 'x-btn-default-small',
            listeners: {
                'afterrender': function(field) {
                    field.removeCls('x-btn-default-toolbar-small');
                    field.btnInnerEl.removeCls('x-btn-inner-default-toolbar-small');
                    field.btnInnerEl.addCls('x-btn-inner-default-small');
                }
            },
            handler: function() {
                var store, records;
                store = this.up('grid').store;
                records = [];
                store.each(function(record) {
                    if (!isBagUploadActive(record.get('status'))) {
                        records.push(record);
                    }
                });
                store.remove(records);
            }
        }, {
            text: "Clear Finished",
            cls: 'x-btn-default-small',
            listeners: {
                'afterrender': function(field) {
                    field.removeCls('x-btn-default-toolbar-small');
                    field.btnInnerEl.removeCls('x-btn-inner-default-toolbar-small');
                    field.btnInnerEl.addCls('x-btn-inner-default-small');
                }
            },
            handler: function() {
                var store, record, i;
                store = this.up('grid').store;
                for (i = 0; i < store.data.items.length; i++) {
                    record = store.getData().getAt(i);
                    if ((record.get('status') === "Uploaded")) {
                        store.remove(record);
                        i--;
                    }
                }
            }
        }, {
            xtype: 'filefield',
            buttonOnly: true,
            buttonText: 'Browse Files...',
            listeners: {
                'afterrender': function(field) {
                    this.fileInputEl.set({ multiple: 'multiple' });
                },
                'change': function(field, path) {
                    var store = this.up('grid').store;

                    Ext.Array.forEach(Ext.Array.from(field.fileInputEl.dom.files), function(file) {
                        if (!file.name.endsWith(".bag")) {
                            Ext.Msg.show({
                                title: 'Not a Bag File',
                                message: 'Only uploading .bag files is allowed.',
                                buttons: Ext.Msg.OK,
                                icon: Ext.Msg.WARN
                            });
                            return false;
                        }
                        addBagUploadFile(store, file);
                    });
                }
            }
        }],
        dockedItems: [{
            xtype: 'panel',
            layout: 'vbox',
            dock: 'bottom',
            padding: 6,
            items: [{
                xtype: 'combobox',
                fieldLabel: 'Target Path',
                itemId: 'targetPath',
                width: '100%',
                labelWidth: 110,
                allowOnlyWhitespace: false,
                store: {
                    fields: ['path'],
                    proxy: {
                        type: 'ajax',
                        url: 'bags/paths',
                        reader: {
                            type: 'json',
                            rootProperty: 'paths',
                            totalProperty: 'totalCount'
                        },
                        simpleSortMode: true
                    },
                    autoLoad: true
                },
                displayField: 'path',
                valueField: 'path',
                value: '/'
            }, {
                xtype: 'combobox',
                fieldLabel: 'Storage Backend',
                itemId: 'storageId',
                width: '100%',
                labelWidth: 110,
                editable: false,
                allowOnlyWhitespace: false,
                store: {
                    fields: ['storageId'],
                    proxy: {
                        type: 'ajax',
                        url: 'bags/get_storage_ids',
                        reader: {
                            type: 'json',
                            rootProperty: 'storageIds',
                            totalProperty: 'totalCount'
                        },
                        simpleSortMode: true
                    },
                    autoLoad: true
                },
                displayField: 'storageId',
                valueField: 'storageId',
                value: ''
            }]
        }],
        postDocument: function(url, item, path, storageId) {
            var xhr, fd;
            xhr = new XMLHttpRequest();
            fd = new FormData();

            fd.append("serverTimeDiff", 0);
            xhr.open("POST", url, true);

            fd.append('targetDirectory', path);
            fd.append('storageId', storageId);
            fd.append(csrfName, csrfToken);
            fd.append('file', item.get('file'));
            xhr.setRequestHeader("serverTimeDiff", 0);
            xhr.upload.onprogress = function(e) {
                var progress;
                if (e.lengthComputable) {
                    progress = Math.round((e.loaded / e.total) * 100);
                    progress = Math.max(0, Math.min(100, progress));
                    if (progress >= 100) {
                        setBagUploadState(item, 'Processing', 100);
                    }
                    else {
                        setBagUploadState(item, 'Uploading', progress);
                    }
                }
                else {
                    setBagUploadState(item, 'Uploading', item.get('progress') || 0);
                }
            };
            xhr.upload.onload = function() {
                setBagUploadState(item, 'Processing', 100);
            };
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        //handle the answer, in order to detect any server side error
                        var response = Ext.decode(xhr.responseText);
                        if (response.success) {
                            setBagUploadState(item, 'Uploaded', 100);
                        }
                        else {
                            setBagUploadState(item, 'Error: ' + response.message);
                        }
                    }
                    else if (xhr.status === 500) {
                        setBagUploadState(item, 'Error');
                    }
                    else if (xhr.status === 0) {
                        setBagUploadState(item, 'Error: Max upload size (50GB) exceeded');
                    }
                    else {
                        setBagUploadState(item, 'Unknown');
                    }
                }
            };
            // Initiate a multipart/form-data upload
            xhr.send(fd);
        }
    }]
});
