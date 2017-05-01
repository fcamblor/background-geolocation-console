var LocationModel = require('../database/LocationModel');

/**
* Location model
*/
var Location = (function() {

    function hydrate(record) {
        if (record.geofence) { record.geofence = JSON.parse(record.geofence); }
        if (record.provider)  { record.provider = JSON.parse(record.provider); }
        if (record.extras)    { record.extras   = JSON.parse(record.extras);   }
        return record;
    }

    function flatten(arrayOfArrays) {
        var results = [];

        arrayOfArrays.forEach(function(arrayVal) {
            if((typeof arrayVal) == "string") {
                results.push(arrayVal);
            } else if(arrayVal && arrayVal.length) {
                Array.prototype.push.apply(results, arrayVal);
            } else {
                results.push(arrayVal);
            }
        });

        return results;
    }

    function pluck(array, key) {
        return array.map(function(entry) {
            return entry[key];
        });
    }

    function extractValuesFromPath(node, path) {
        var pathChunks = path.split(".");
        var currentNode = [ node ];
        pathChunks.forEach(function(pathChunk) {
            currentNode = flatten(pluck(currentNode, pathChunk));
        });
        return currentNode;
    }

    // extraConditions should be an array like [ "extraFieldName=extraFieldValue", "extraFieldName=extraFieldValue" ]
    var $containsRegex = /\$contains\(([^)]+)\)/;
    function rowMatchesExtraConditions(record, extraConditions) {
        var extras = JSON.parse(record.extras);
        if(!extras) {
            return false;
        }

        return extraConditions.every(function(extraCondition) {
            var extraCondSplit = extraCondition.split("=");
            var conditionFieldPath = extraCondSplit[0];
            var conditionValue = extraCondSplit[1];

            var values = extractValuesFromPath(extras, conditionFieldPath);
            var $containsRegexResult = new RegExp($containsRegex, 'gi').exec(conditionValue);
            if($containsRegexResult) {
                var containedSearchedValue = $containsRegexResult[1].toUpperCase();
                return values.map(function(val){ return val?(""+val).toUpperCase():val; }).indexOf(containedSearchedValue) !== -1;
            } else {
                return (""+values[0]).toUpperCase() == conditionValue.toUpperCase();
            }
        });
    }

    return {
        all: function(params, success, error) {
            var whereConditions = {};
            if (params.start_date && params.end_date) {
                whereConditions.recorded_at = { $between: [params.start_date, params.end_date] };
            }
            if (params.device_id && params.device_id !== '') {
                whereConditions.device_id = params.device_id;
            }

            LocationModel.findAll({
                where: whereConditions,
                order: 'recorded_at DESC'
            }).then(function(rows) {
                var locations = [];

                rows.forEach(function (row) {
                    if(!params.extras || rowMatchesExtraConditions(row, params.extras.split(","))) {
                        locations.push(hydrate(row));
                    }
                });
                success(locations);
            }, function(err){
                console.error("Fetch all locations error : ", err);
                error(err);
            }).catch(error);
        },
        create: function(params) {
            var location  = params.location,
                device    = params.device || {model: "UNKNOWN"};

            // Considering we're always working with locations array
            var locations = location.length?location:[location];

            locations.forEach(function(location){
                var coords    = location.coords,
                    battery   = location.battery  || {level: null, is_charging: null},
                    activity  = location.activity || {type: null, confidence: null},
                    geofence  = (location.geofence) ? JSON.stringify(location.geofence) : null,
                    provider  = (location.provider) ? JSON.stringify(location.provider) : null,
                    extras    = (location.extras) ? JSON.stringify(location.extras) : null,
                    now       = new Date(),
                    uuid      = (device.framework) ? (device.framework + '-' + device.uuid) : device.uuid,
                    model     = (device.framework) ? (device.model + ' (' + device.framework + ')') : device.model;

                LocationModel.create({
                    uuid: location.uuid,
                    device_id: uuid,
                    device_model: model,
                    latitude: coords.latitude,
                    longitude: coords.longitude,
                    accuracy: coords.accuracy,
                    altitude: coords.altitude,
                    speed: coords.speed,
                    heading: coords.heading,
                    odometer: location.odometer,
                    event: location.event,
                    activity_type: activity.type,
                    activity_confidence: activity.confidence,
                    battery_level: battery.level,
                    battery_is_charging: battery.is_charging,
                    is_moving: location.is_moving,
                    geofence: geofence,
                    provider: provider,
                    extras: extras,
                    recorded_at: location.timestamp,
                    created_at: now
                });
            });
        },
        deleteLocations: function(params, success, error) {
            var whereConditions = {};
            if(params && params.deviceId) {
                whereConditions.device_id = params.deviceId;
            }
            if(params && params.start_date && params.end_date) {
                whereConditions.recorded_at = { $between: [params.start_date, params.end_date] };
            }

            if(!Object.keys(whereConditions).length) {
                error("Missing some location deletion constraints");
                return;
            }

            LocationModel.destroy({ where: whereConditions }).then(success, error);
        }
    }
})();


module.exports = Location;