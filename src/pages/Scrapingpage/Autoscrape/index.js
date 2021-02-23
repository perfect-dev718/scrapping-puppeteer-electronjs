import React from 'react';
import {Form, Col} from "react-bootstrap";
import Layout from '../../../sections/Layout';
import Button from "react-bootstrap/Button";
import history from "../../../utils/history";

const Autoscrape = (props) => {
    return (
        <Layout {...props}>
            <div className="text-center pt-0 pb-5 mb-0">
                <div className="text-left">
                    <br/>
                    <span className="mx-md-3 mx-sm-0 navbar-brand" style={{fontSize: 24}}>
                        Auto Scrape Configuration
                    </span>
                    <hr className="mt-0"/>
                </div>
                <div className="text-center pt-5">
                    <Form className="text-left">
                        <Form.Row>
                            <Form.Group as={Col} md={8} className="pr-2">
                                <Form.Label className="text-left">Root Domain / Domains</Form.Label>
                                <Form.Control as="textarea" rows="7"/>
                            </Form.Group>
                            <Form.Group as={Col} md={4}>
                                <Form.Label>TimeOut Page</Form.Label>
                                <Form.Control type="text" placeholder="TimeOut Page"/>
                                <Form.Label>Links Deep</Form.Label>
                                <Form.Control type="text" placeholder="Links Deep"/>
                                <Form.Label>Page Limit Per Domain</Form.Label>
                                <Form.Control type="text" placeholder="Page Limit Per Domain"/>
                            </Form.Group>
                        </Form.Row>
                    </Form>
                    <br/>
                    <Button variant='outline-secondary' className="mt-3" style={{width: "100%", height: 47}}
                            onClick={() => history.push('/')}>
                        Start Scraping
                    </Button>
                </div>
            </div>
        </Layout>
    );
}

export default Autoscrape;
