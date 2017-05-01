import {API_URL} from '../../constants';

export const SET_LOCATIONS = 'SET_LOCATIONS';

/**
* locations
*/
export function getLocations(filter) {
  return dispatch => {

    let extraFilters = [];
    if(filter.vehicle) { extraFilters.push(`vehicle=${filter.vehicle}`); }
    if(filter.carrierId) { extraFilters.push(`carrierId=${filter.carrierId}`); }
    if(filter.loadNumber) { extraFilters.push(`registeredRoutes.loadId=$contains(${filter.loadNumber})`); }

    return fetch(`${API_URL}/locations?device_id=${filter.deviceId}&start_date=${filter.startDate.toISOString()}&end_date=${filter.endDate.toISOString()}${extraFilters.length?'&extras='+extraFilters.join(','):''}`)
      .then(res => res.json())
      .then(res => res)
      .then((locations) => {
        dispatch(setLocations(locations));
      });
  }
}

export function setLocations(locations) {
  return {
    type: SET_LOCATIONS,
    locations
  }
}
