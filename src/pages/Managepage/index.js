import React from 'react';
import Layout from '../../sections/Layout';
import ModifyButton from "../../components/ModifyButton";

const Managepage = (props) => {
    return (
        <Layout {...props}>
            <div className="text-center pb-5">
                <div className="pt-5">
                    <br/>
                    <span style={{fontSize: 30}}>
            What would you like to do?
          </span>
                </div>
                <ModifyButton props={{text: "New Data", width: 280, height: 110, link: '/newdata'}}/>
                <ModifyButton props={{text: "Approved Data", width: 280, height: 110, link: '/approveddata'}}/>
                <br/><br/><br/>
            </div>
        </Layout>
    );

}

export default Managepage;
