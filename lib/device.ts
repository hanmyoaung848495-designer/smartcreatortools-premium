
export const getDeviceId = () => {
    let deviceId = localStorage.getItem('smart_creator_device_id');
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
        localStorage.setItem('smart_creator_device_id', deviceId);
    }
    return deviceId;
};
