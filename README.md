# remarkable-node
Unofficial reMarkable api wrapper for node.js based on [these unofficial docs](https://github.com/splitbrain/ReMarkableAPI/wiki).

## Install
`yarn add remarkable-node`

## Usage

```js
import { Remarkable, ItemTypes } from 'remarkable-node';
// const { Remarkable, ItemTypes } = require('remarkable-node');

(async () => {
    const client = new Remarkable();

    // create a code at https://my.remarkable.com/connect/desktop
    const token = await client.register({code: 'created code'});

    // (optional) skip registration in the future with `new Remarkable({token})`
    console.log(token);

    // List items
    const items = await client.listItems();

    // property list: https://github.com/splitbrain/ReMarkableAPI/wiki/Storage
    for (const item of items) {
        if (item.Type === ItemTypes.CollectionType) {
            // Do something with the collection
        } else if (item.Type === ItemTypes.DocumentType) {
            // Do something with the document
        }
    }

    // Get an item
    const item = await client.getItem({id: 'some uuid'});

    // Delete an item
    await client.deleteItem({id: 'some uuid'});
})();
```

### 

## License
MIT
