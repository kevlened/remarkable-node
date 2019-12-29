const os = require('os');
const querystring = require('querystring');
const got = require('got');
const uuid = require('uuid/v5');
const hex = require('hex-lite');
const getMac = require('getmac').default;
const pkg = require('../package');

class Remarkable {
    constructor({token} = {}) {
        if (token) this._setToken(token);
        else this._client = got.extend({responseType: 'json'});
    }

    /**
     * @internal
     * @hidden
     * @private
     */
    _setToken(token) {
        if (!token) throw new Error('Must provide a token');
        this._client = got.extend({
            responseType: 'json',
            headers: {
                Authorization: `Bearer ${token}`,
                'user-agent': `remarkable-node/${pkg.version}`
            },
            hooks: {
                beforeError: [
                    e => {
                        const {response} = e;
                         if (response && response.body && typeof response.body === 'string') {
                            e.message = e.response.body;
                        }
                         return e;
                    }
                ]
            }
        });
        return this._token = token;
    }

    /**
     * @internal
     * @hidden
     * @private
     */
    async _refreshToken(token) {
        token = token || this._token;
        if (!token) throw new Error('Must provide the previous token');
        const {body} = await this._client.post('https://my.remarkable.com/token/json/2/user/new');
        return this._setToken(body);
    }

    /**
     * @internal
     * @hidden
     * @private
     */
    async _getStorageUrl({environment = 'production', group = 'auth0|5a68dc51cb30df3877a1d7c4', apiVer = 2} = {}) {
        if (this._storageUrl) return this._storageUrl;
        const {body} = await this._client.get(`https://service-manager-production-dot-remarkable-production.appspot.com/service/json/1/document-storage?environment=${environment}&group=${group}&apiVer=${apiVer}`);
        return this._storageUrl = `https://${body.Host}`;
    }

    /**
     * @internal
     * @hidden
     * @private
     */
    async _getNotificationsUrl({environment = 'production', group = 'auth0|5a68dc51cb30df3877a1d7c4', apiVer = 1} = {}) {
        if (this._notificationUrl) return this._notificationUrl;
        const {body} = await this._client.get(`https://service-manager-production-dot-remarkable-production.appspot.com/service/json/1/notifications?environment=${environment}&group=${group}&apiVer=${apiVer}`);
        return this._notificationUrl = `wss://${body.Host}`;
    }

    async register({code, deviceDesc = 'desktop-windows', deviceId} = {}) {
        if (!code) {
            throw new Error('Must provide a code from https://my.remarkable.com/connect/desktop');
        }

        // Generate a deviceId that remains constant for this user on this machine
        if (!deviceId) {
            let fingerprint
            fingerprint += os.platform();
            fingerprint += os.arch();
            fingerprint += os.hostname();
            fingerprint += os.cpus()[0].model;

            let namespace = Array(16).fill(0);
            const mac = getMac();
            if (mac) {
                namespace = new Array(10)
                    .fill(0)
                    .concat(
                        ...hex.toUint8Array(mac.replace(/:/g, ''))
                    );
            }
            
            deviceId = uuid(fingerprint, namespace);
        }
    
        // Make request
        const {body} = await got.post('https://my.remarkable.com/token/json/2/device/new', {
            json: {code, deviceDesc, deviceId},
        });
        return this._setToken(body);
    }

    async listItems({doc, withBlob = true} = {}) {
        let url = await this._getStorageUrl();
        url += '/document-storage/json/2/docs';
        const query = {};
        if (doc) query.doc = doc;
        if (withBlob) query.withBlob = withBlob;
        if (doc || withBlob) url += `?${querystring.stringify(query)}`;

        const {body} = await this._client.get(url);
        return body;
    }

    async getItem({id}) {
        return (await this.listItems({doc: id}))[0];
    }

    async deleteItem({id}) {
        let url = await this._getStorageUrl();
        url += '/document-storage/json/2/delete';
        const {body} = await this._client.put(url, {
            json: [{
                ID: id,
                Version: 1
            }]
        });
        return body;
    }
}

/** @enum {string} */
const ItemType = {
    DocumentType: 'DocumentType',
    CollectionType: 'CollectionType'
};

module.exports = {
    Remarkable,
    ItemType
}
