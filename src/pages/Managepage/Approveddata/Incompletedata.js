import React, {useEffect, useRef, useState} from 'react';
import {Form, Table} from "react-bootstrap";
import {faCheck, faCheckCircle, faPencilAlt, faTimesCircle, faTrash} from "@fortawesome/free-solid-svg-icons";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

const electron = window.require('electron');
const ipcRenderer = electron.ipcRenderer;

const Incompletedata = (props) => {
    const [approvedData, setApprovedData] = useState([{}]);
    const [loading, setLoading] = useState(false);
    const [editing, setEditing] = useState({state: false, index: 0});
    const [editingItem, setEditingItem] = useState({});
    const curRef = useRef(null);

    useEffect(() => {
        curRef.current = true;
        return () => curRef.current = false;
    }, [])

    useEffect(() => {
        let mounted = true;
        ipcRenderer.send('getApprovedData');
        ipcRenderer.on('receiveApprovedData', (event, message) => {
            if (mounted) setApprovedData(JSON.parse(message));
        })
        return () => mounted = false;
    }, [loading])

    const onEdit = (item, index) => {
        setLoading(true);
        setEditing({state: true, index: index});
        setEditingItem(item);
    }

    const onSave = (item, index) => {
        ipcRenderer.send('updateOneApprovedData', JSON.stringify(item));
        ipcRenderer.on('updatedOneApprovedData', (event, message) => {
            console.log(message);
            setLoading(false);
        })
        setEditing({state: false, index: 0});
    }

    const onChangeText = (e, index) => {
        setEditingItem({...editingItem, [e.target.name]: e.target.value});
    }

    const onDelete = (item) => {
        setLoading(true);
        console.log('delete ==> ', item._id);
        ipcRenderer.send('deleteOneApprove', item._id);
        ipcRenderer.on('deletedOneApprove', (event, message) => {
            console.log(message);
            if(curRef.current) setLoading(false);
        })
    }

    const markIncomplete = (item) => {
        console.log('mark complete...')
        setLoading(true);
        item.Complete = true;
        ipcRenderer.send('updateOneApprovedData', JSON.stringify(item));
        ipcRenderer.on('updatedOneApprovedData', (event, message) => {
            console.log(message);
            if(curRef.current) setLoading(false);
        })
    }

    return (
        <Table striped hover>
            <thead>
            <tr>
                <th>Source</th>
                <th>Email Address</th>
                <th>Name</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Edit/Add Tag</th>
                <th>Mark as Complete</th>
                <th>Trash</th>
            </tr>
            </thead>
            <tbody>
            {approvedData.length > 0
            && approvedData.filter(item => !item.Complete /*&& (item.Source.includes(props.searchText) || item.Email.includes(props.searchText) || item.LastName.includes(props.searchText) || item.Phone.includes(props.searchText))*/)
                .map((item, index) => {
                    return (
                        <tr key={index}>
                            <td>{(editing.state && editing.index === index) ?
                                <Form.Control className="text-muted" value={editingItem.Source || ''} name={"Source"}
                                              onChange={(e) => onChangeText(e, index)}/>
                                : item.Source}
                            </td>
                            <td>{(editing.state && editing.index === index) ?
                                <Form.Control className="text-muted" value={editingItem.Email || ''} name={"Email"}
                                              onChange={(e) => onChangeText(e, index)}/>
                                : item.Email}
                            </td>
                            <td>{(editing.state && editing.index === index) ?
                                <Form.Control className="text-muted" value={editingItem.LastName || ''} name={"LastName"}
                                              onChange={(e) => onChangeText(e, index)}/>
                                : item.LastName}
                            </td>
                            <td>Editor</td>
                            <td>{(editing.state && editing.index === index) ?
                                <Form.Control className="text-muted" value={editingItem.Phone || ''} name={"Phone"}
                                              onChange={(e) => onChangeText(e, index)}/>
                                : item.Phone}
                            </td>
                            <td width={10}>
                                {(editing.state && editing.index === index) ? <FontAwesomeIcon
                                        icon={faCheck}
                                        className="icon-btn"
                                        style={{color: '#4caf50'}}
                                        size="lg"
                                        onClick={() => onSave(editingItem, index)}/>
                                    :
                                    <FontAwesomeIcon
                                        icon={faPencilAlt}
                                        className="icon-btn"
                                        style={{color: '#2196f3'}}
                                        size="lg"
                                        onClick={() => onEdit(item, index)}/>
                                }
                            </td>
                            <td width={10}>
                                <FontAwesomeIcon icon={faCheckCircle} className="icon-btn" style={{color: '#4caf50'}}
                                                 size="lg"
                                                 onClick={() => markIncomplete(item)}/>
                            </td>
                            <td width={10}>
                                <FontAwesomeIcon icon={faTrash} className="icon-btn" size="lg"
                                                 onClick={() => onDelete(item)}/>
                            </td>
                        </tr>
                    )
                }
            )}
            </tbody>
        </Table>
    );
}

export default Incompletedata;
