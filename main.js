const {app, BrowserWindow, ipcMain} = require('electron')
const electron = require('electron');
require('dotenv').config();
// const ipcMain = electron['ipcMain'];
const path = require('path');
let db = null;
const mongodb = require('mongodb');

function createWindow() {
    // Create the browser window.
    let mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true
        }
    })

    // and load the index.html of the app.
    //mainWindow.loadURL(`file://${path.join(__dirname, 'build/index.html')}`);
    // mainWindow.loadFile('index.html');
    mainWindow.loadURL('http://localhost:3000');

    mainWindow.on('closed', () => {
        mainWindow = null
    });

    ipcMain.setMaxListeners(11);

    ipcMain.on('getNewData', async (event) => {
        let newData = await db.collection('newData').find({}).toArray();
        event.reply('receiveNewData', JSON.stringify(newData));
    })
    ipcMain.on('deleteOne', async (event, id) => {
        await db.collection('newData').deleteOne({_id: new mongodb.ObjectID(id)});
        event.reply('deletedOne', "ok");
    })

    ipcMain.on('getApprovedData', async (event) => {
        let approvedData = await db.collection('approvedData').find({}).toArray();
        event.reply('receiveApprovedData', JSON.stringify(approvedData));
    })

    ipcMain.on('insertOneApprovedData', async (event, item) => {
        let insertItem = JSON.parse(item);
        let newItem = {};
        newItem.FirstName = insertItem.FirstName;
        newItem.LastName = insertItem.LastName;
        newItem.JobTitle = insertItem.JobTitle;
        newItem.Organisation = insertItem.Organisation;
        newItem.Phone = insertItem.Phone;
        newItem.Email = insertItem.Email;
        newItem.AddressLine1 = insertItem.AddressLine1;
        newItem.AddressLine2 = insertItem.AddressLine2;
        newItem.City = insertItem.City;
        newItem.State = insertItem.State;
        newItem.Country = insertItem.Country;
        newItem.Website = insertItem.Website;
        newItem.Domain = insertItem.Domain;
        newItem.ProgramSegment = insertItem.ProgramSegment;
        newItem.Source = insertItem.Source;
        newItem.Complete = false;
        newItem.Tags = "";
        let approvedData = await db.collection('approvedData').insertOne(newItem);
        event.reply('insertedOneApprovedData', "ok");
    })

    ipcMain.on('updateOneApprovedData', async (event, item) => {
        let newItem = JSON.parse(item);
        var myquery = {_id: new mongodb.ObjectID(newItem._id)};
        var newvalues = {
            $set: {
                Source: newItem.Source,
                Email: newItem.Email,
                LastName: newItem.LastName,
                Phone: newItem.Phone,
                Complete: newItem.Complete
            }
        };
        await db.collection('approvedData').updateOne(myquery, newvalues);
        event.reply('updatedOneApprovedData', "ok");
    })

    ipcMain.on('deleteOneApprove', async (event, id) => {
        await db.collection('approvedData').deleteOne({_id: new mongodb.ObjectID(id)});
        event.reply('deletedOneApprove', "ok");
    })
}

const MongoClient = require('mongodb').MongoClient;
const url = process.env.MONGODB_URI;

// const client = new MongoClient(url, {useNewUrlParser: true, useUnifiedTopology: true});
MongoClient.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}, (err, client) => {
    if (err) {
        console.log('database error ==> ', err);
        throw err;
        app.exit();
    }
    db = client.db('test');
    // db = client.db('ScraperData');
});

app.on('ready', createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// app.whenReady().then(createWindow)
