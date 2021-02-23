import React from 'react';
import Layout from '../../sections/Layout';
import ModifyButton from '../../components/ModifyButton';

const Scrapepage = (props) => {
    return (
        <Layout {...props}>
            <div className="text-center pt-2 pb-5 mb-5">
                <div className="pt-5">
                    <br/>
                    <span style={{fontSize:30}}>
            How are we scraping today?
          </span>
                </div>
                <ModifyButton props={{text:"Manual Upload", width:280, height:110, link:'/manualupload'}}/>
                <ModifyButton props={{text:"Auto Scrape", width:280, height:110, link:'/autoscrape'}}/>
                <ModifyButton props={{text:"LinkedIn Scrape", width:280, height:110, link:'/'}}/>
                <br/>
                <ModifyButton props={{text:"Return Home", width:280, height:47, link:'/'}}/>
            </div>
        </Layout>
    );
}

export default Scrapepage;
