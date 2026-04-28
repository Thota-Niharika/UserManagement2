import fs from 'fs';
import axios from 'axios';

axios.get('https://usermanagement-ofsl.onrender.com/api/employees')
    .then(r => {
        const list = r.data.data || r.data.content || r.data;
        list.forEach(emp => {
            console.log(`Name: ${emp.fullName}, Code: ${emp.empId || emp.empCode || emp.employeeCode || 'N/A'}`);
        });
    })
    .catch(e => console.error(e.message));

