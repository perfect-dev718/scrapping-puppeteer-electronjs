import React, {useEffect, useState} from 'react';
import Layout from '../../../sections/Layout';
import {Table} from "react-bootstrap";
import {faCheckCircle, faTimesCircle, faTrash} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import '../../../styles/pages/managepages.scss';

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

const Newdata = (props) => {

    const [newData, setNewData] = useState([{}]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        // setLoading(true);
        console.log("Manage page ===> ");
        ipcRenderer.send('getNewData');
        ipcRenderer.on('receiveNewData', (event, message) => {
            console.log(message);
            let newData = JSON.parse(message);
            if (mounted) {
                setNewData(newData);
                // setLoading(false);
            }
        })
        return () => mounted = false;
    }, [loading])

    const approve = (item) => {
        setLoading(true);
        console.log('delete ==> ', item._id);
        ipcRenderer.send('deleteOne', item._id);
        ipcRenderer.on('deletedOne', (event, message) => {
            console.log(message);
            setLoading(false);
            ipcRenderer.send('insertOneApprovedData', JSON.stringify(item));
            ipcRenderer.on('insertedOneApprovedData', (event, message) => {
                console.log(message);
            })
        })
    }

    const deleteRow = (item) => {
        setLoading(true);
        console.log('delete ==> ', item._id);
        ipcRenderer.send('deleteOne', item._id);
        ipcRenderer.on('deletedOne', (event, message) => {
            console.log(message);
            setLoading(false);
        })
    }

    return (
        <Layout {...props}>
            <div className="text-center pt-0 pb-5 mb-0">
                <div className="text-left">
                    <br/>
                    <span className="mx-md-3 mx-sm-0 navbar-brand" style={{fontSize: 24}}>
                        New Data
                    </span>
                    <hr className="mt-0"/>
                </div>
                <Table striped hover>
                    <thead>
                    <tr>
                        <th>Source</th>
                        <th>Email Address</th>
                        <th>Name</th>
                        <th>Role</th>
                        <th>Phone</th>
                        <th>Approve</th>
                        <th>Delete</th>
                    </tr>
                    </thead>
                    <tbody>
                    {newData.length > 0 && newData.map((item, index) => {
                        return (
                            <tr key={index}>
                                <td>{item.Domain}</td>
                                <td>{item.Email}</td>
                                <td>{item.LastName + ", " + item.FirstName}</td>
                                <td>Editor</td>
                                <td>{item.Phone}</td>
                                <td>
                                    <FontAwesomeIcon icon={faCheckCircle} className="icon-btn"
                                                     style={{color: '#4caf50'}}
                                                     size="lg" onClick={() => approve(item)}/>
                                </td>
                                <td>
                                    <FontAwesomeIcon icon={faTrash} className="icon-btn" size="lg"
                                                     onClick={() => deleteRow(item)}/>
                                </td>
                            </tr>
                        )
                    })
                    }
                    </tbody>
                </Table>
            </div>
        </Layout>
    );
}

export default Newdata;
