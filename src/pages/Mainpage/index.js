import React, {useEffect} from 'react';
import Layout from '../../sections/Layout';
import ModifyButton from "../../components/ModifyButton";

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

const Mainpage = (props) => {

    useEffect(() => {
        /*ipcRenderer.send('get');
        ipcRenderer.on('receive-settings', (event, message) => {
            console.log(message);
        })*/
    }, [])

  return (
    <Layout {...props}>
      <div className="text-center pb-5">
        <div className="pt-5">
          <br/>
          <span style={{fontSize:30}}>
            What would you like to do?
          </span>
        </div>
        <ModifyButton props={{text:"Scrape Data", width:280, height:110, link:'/scraping'}}/>
        <ModifyButton props={{text:"Manage Data", width:280, height:110, link:'/manage'}}/>
        <br/><br/><br/>
      </div>
    </Layout>
  );

}

export default Mainpage;
