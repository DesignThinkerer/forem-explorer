// Application State
export const state = {
    currentRawData: null,
    currentFullUrl: "",
    userLocation: null
};

export function setRawData(data) {
    state.currentRawData = data;
}

export function setFullUrl(url) {
    state.currentFullUrl = url;
}

export function setUserLocation(location) {
    state.userLocation = location;
}

export function getUserLocation() {
    return state.userLocation;
}

export function getRawData() {
    return state.currentRawData;
}

export function getFullUrl() {
    return state.currentFullUrl;
}
