var App = function (dataset) {

    var departement, pymChild, zoomOnScroll = true;

    if (dataset && dataset.dpt) {
        departement = dataset.dpt;
    } else if (mkcMapFrame) {
        departement = mkcMapFrame.dptFromQS() || '31';
    } else {
        departement = '31';
    }

    if (dataset && dataset.zoomonscroll && dataset.zoomonscroll === "false") {
        zoomOnScroll = false;
    }

    var colors = {
        "ANAR":"#000000",
        "EXG":"#BB0000",
        "LO":"#BB0000",
        "NPA":"#BB0000",
        "FG":"#DD0000",
        "PCF":"#DD0000",
        "COM":"#DD0000",
        "PG":"#DD0000",
        "MRC":"#CC6666",
        "ND":"#CC6666",
        "VEC":"#00C000",
        "EELV":"#00C000",
        "CAP":"#77FF77",
        "DVE":"#77FF77",
        "PS":"#FF8080",
        "SOC":"#FF8080",
        "PRG":"#FFD1DC",
        "RDG":"#FFD1DC",
        "DVG":"#FFC0C0",
        "MDM":"#FF9900",
        "UC":"#74C2C3",
        "NC":"#00FFFF",
        "UDI":"#00FFFF",
        "DVD":"#ADC1FD",
        "UMP":"#0066CC",
        "PR":"#0066CC",
        "DLR":"#8040C0",
        "MPF":"#8040C0",
        "PP":"#8040C0",
        "FN":"#C0C0C0",
        "SP":"#C0C0C0",
        "EXD":"#404040",
        "DIV":"#F0F0F0",
        "DLF":"#CCC",
        "UC":"#74C2C3",
        "UD":"#ADC1FD",
        "UG":"#FFC0C0",
        "egal":"white",
        "BLANC":"white"
        };
    var self = this;

    var options = {
        tileUrl: 'http://tilestream.makina-corpus.net/v2/osmlight-france/{z}/{x}/{y}.png',
        contour: {
            url: '../../../resources/bureaux/' + departement + '.geojson',
            type: 'geojson',
        },
        scrollWheelZoom: zoomOnScroll,
        containerId: 'map',
        attribution: 'Tuiles par <a href="http://makina-corpus.com/expertise/cartographie">Makina Corpus</a> & données &copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    };

    self.setPym = function (pC) {
        pymChild = pC;
    };

    self.init = function () {
        if (mkcMapFrame && dataset) {
            if (pymChild) {
                mkcMapFrame.init(dataset, pymChild);
            }
        }

        // init map
        self.map = L.map(options.containerId, {
            fullscreenControl: true,
            minZoom: 6,
            attributionControl: false,
            scrollWheelZoom: options.scrollWheelZoom
        }).setActiveArea('activeArea').setView([43.55, 1.45], 12);

        // Default tile layer
        self.tileLayer = L.tileLayer(options.tileUrl, {
            attribution: options.attribution,
            maxZoom: 14
        });
        self.tileLayer.addTo(self.map);

        // OpenStreetMap tile layer for high zoom level
        self.tile2Layer = L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
            minZoom: 15
        });
        self.tile2Layer.addTo(self.map);

        // Read result from json
        var results = {};
        $.getJSON('../../data/resultats/tour1/' + departement + '.json', function (data) {

            /**
             * Sort results by bureau
             * identify winner of each one.
             */

            var bureauId, parti, score, currentData;
            // Start with i = 1 because of headers row
            for (var i = 1; i < data.length; i++) {
                currentData = data[i];
                bureauId    = currentData[1];
                parti       = currentData[3];
                score       = currentData[4];

                // Create bureau only if not already existing
                if (!results[bureauId]) {
                    results[bureauId] = {
                        scores: {},
                        winner: {
                            parti: 'NUL',
                            score: 0
                        }
                    };
                }

                // If current score is higher than previous winner, store it as winner
                if (parti && parti !== 'ABSTENTION' && parti !== 'NUL') {
                  if (score > results[bureauId].winner.score) {
                    results[bureauId].winner = {
                      parti: parti,
                      score: score
                    };
                  } else if (score === results[bureauId].winner.score) {
                    results[bureauId].winner = {
                      parti: "BC-egal",
                      score: score
                    };
                  }
                }
                if (!parti) {
                    parti = currentData[2];
                }
                results[bureauId].scores[parti] = score;
            }

            /**
             * Draw bureaux
             */

            // Initialize empty geojson layer
            var customLayer = L.geoJson(null, {
                onEachFeature: onEachFeature,
                style: {color: '#293133'}
            });
            function highlightFeature(e) {
                var layer = e.target;
                layer.setStyle({weight: 4});
                legend.update(""+parseInt(layer.feature.properties.BV2015));
            }
            function resetHighlight(e) {
                var layer = e.target;
                layer.setStyle({weight: 1});
            }

            function onEachFeature(feature, layer) {
                var bureau = results[""+parseInt(feature.properties.BV2015)];
                var color = 'grey';
                var opacity = 0;
                if (bureau) {
                    color = colors[bureau.winner.parti.split('-')[1]];
                    opacity = 0.6
                }
                layer.setStyle({ fillColor: color, weight: 1, fillOpacity: opacity});
                layer.on({
                    mouseover: highlightFeature,
                    mouseout: resetHighlight,
                });
            }

            // Populate geojson layer with omnivore plugin and rturn it;
            var contourLayer = omnivore.geojson(options.contour.url, null, customLayer);

            contourLayer.on('ready', function () {
                //self.map.fitBounds(customLayer.getBounds());
            });

            // small fix
            contourLayer.on("dblclick", function (event){
                self.map.fire("dblclick", event);
            });

            // Attach geojson layer to map
            contourLayer.addTo(self.map);

            // button hidden in css because it's causing fllickering
            //  !!!!!!!!!!
            //  !!!!!!!!!!
            /*
            var resetView = L.control({position: 'topleft'});
            resetView.onAdd = function (map) {
                this._div = L.DomUtil.create('div', 'leaflet-control-resetview leaflet-bar');
                this._div.innerHTML = '<a class="leaflet-control-resetview-button leaflet-bar-part" href title="Reset View"></a>';
                jQuery(this).on('click', function (e) {
                    e.preventDefault();
                    self.map.fitBounds(customLayer.getBounds());
                });
                return this._div;
            }
            resetView.addTo(self.map);
            */
        });

        // Optionnal logo
        if (dataset && dataset.logo) {
            var vendorLogo = L.control({position: 'bottomleft'});
            vendorLogo.onAdd = function (map) {
                this._div = L.DomUtil.create('div', 'vendors-logo');
                this._div.innerHTML = '<img id="vendor-logo" src="' + dataset.logo + '" />';
                return this._div;
            };
            vendorLogo.addTo(self.map);
        }

        // Legend
        var legend = L.control({position: 'topright'});

        legend.onAdd = function (map) {
            this._div = L.DomUtil.create('div', 'legend info');
            this.update();
            return this._div;
        };

        legend.update = function (bureau) {
            var html = '<h3>Résultats à Toulouse</h3>';
            if(bureau && results[bureau]) {
                html += '<ul>';
                var total = 0;
                for(var parti in results[bureau].scores) {
                    if(parti != "ABSTENTION" && parti != "NUL") {
                      total += results[bureau].scores[parti];
                    }
                }
                for(var parti in results[bureau].scores) {
                    var score = results[bureau].scores[parti];
                    if(!score) {
                        score = 0;
                    }
                    if(parti == "ABSTENTION" || parti == "NUL") {
                        html += '<li>' + parti + ' (' + score + ' voix)</li>';
                    } else {
                        var label_parti = (parti.indexOf('-') > 0 ? parti.split('-')[1] : parti);
                        var ratio = Math.round(100 * score / total);
                        html += '<li>';
                        if (score == results[bureau].winner.score) {
                          html += '<strong>';
                        }
                        html += label_parti + ' '+ratio+'% (' + score + ' voix)</li>';
                        if (score == results[bureau].winner.score) {
                          html += '</strong>';
                        }
                        html += '<div style="display:inline-block;width:' + (2 * ratio) + 'px;height:10px;background-color:' + colors[label_parti] +';"></div></li>';
                    }
                }
                html += '</ul>';
            }

            html += 'Survolez un bureau de vote pour plus de détails';
            html += '<a href="http://www.makina-corpus.com" target="_blank"><img id="logo" src="http://makina-corpus.com/++theme++plonetheme.makinacorpuscom/images/logo.png"></a>';
            this._div.innerHTML = html;
        };
        legend.addTo(self.map);
        L.control.attribution({position: 'topright'}).addTo(self.map);
    };
};
