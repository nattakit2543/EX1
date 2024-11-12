import React, { useState, useEffect } from 'react';
import { useParams ,BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = 'http://localhost:3001';

function MemberForm({ onSubmit, memberData }) {
    const [formData, setFormData] = useState({
        title: memberData?.title || 'นาย',
        firstName: memberData?.firstName || '',
        lastName: memberData?.lastName || '',
        birthdate: memberData?.birthdate || '',
        profileImage: null,
    });

    const handleChange = (e) => {
        const { name, value, files } = e.target;
        setFormData({
            ...formData,
            [name]: files ? files[0] : value,
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit}>
            <select name="title" value={formData.title} onChange={handleChange}>
                <option value="นาย">นาย</option>
                <option value="นาง">นาง</option>
                <option value="นางสาว">นางสาว</option>
            </select>
            <input name="firstName" value={formData.firstName} onChange={handleChange} placeholder="ชื่อ" />
            <input name="lastName" value={formData.lastName} onChange={handleChange} placeholder="นามสกุล" />
            <input name="birthdate" type="date" value={formData.birthdate} onChange={handleChange} placeholder="วันเดือนปีเกิด" />
            <input name="profileImage" type="file" onChange={handleChange} />
            <button type="submit">บันทึกข้อมูล</button>
        </form>
    );
}

function MemberList() {
  const [members, setMembers] = useState([]);

  useEffect(() => {
      axios.get(`${API_URL}/members`).then((response) => {
          setMembers(response.data);
      });
  }, []);

  return (
      <div>
          <h2>รายชื่อสมาชิก</h2>
          <ul>
              {members.map((member) => (
                  <li key={member.id}>
                      {member.title} {member.first_name} {member.last_name} - อายุ: {member.age}
                      {member.profile_image_url && (
    <img
        src={`http://localhost:3001/${member.profile_image_url}`}
        alt={`${member.first_name} ${member.last_name}`}
        style={{ width: '100px', height: '100px', objectFit: 'cover' }}
    />
)}

                      <Link to={`/edit/${member.id}`}> แก้ไข</Link>
                      <button onClick={() => handleDelete(member.id)}>ลบ</button>
                  </li>
              ))}
          </ul>
      </div>
  );

  function handleDelete(id) {
      axios.delete(`${API_URL}/members/${id}`).then(() => {
          setMembers(members.filter((m) => m.id !== id));
      });
  }
}


function AddMember() {
    const handleSubmit = (formData) => {
        const data = new FormData();
        Object.keys(formData).forEach((key) => data.append(key, formData[key]));

        axios.post(`${API_URL}/members`, data)
            .then(() => window.location = '/')
            .catch((error) => console.error(error));
    };

    return (
        <div>
            <h2>เพิ่มสมาชิกใหม่</h2>
            <MemberForm onSubmit={handleSubmit} />
        </div>
    );
}

function EditMember() {
  const { id: memberId } = useParams(); // ใช้ useParams เพื่อดึง memberId จาก URL
  const [memberData, setMemberData] = useState(null);

  useEffect(() => {
      if (memberId) { // ตรวจสอบว่า memberId ไม่เป็น undefined
          axios.get(`${API_URL}/members/${memberId}`)
              .then((response) => setMemberData(response.data))
              .catch((error) => {
                  console.error(error);
                  alert('ไม่สามารถดึงข้อมูลสมาชิกได้');
              });
      } else {
          console.error('Member ID is undefined');
          alert('ไม่พบข้อมูลสมาชิก');
      }
  }, [memberId]);

  const handleSubmit = (formData) => {
      const data = new FormData();
      Object.keys(formData).forEach((key) => data.append(key, formData[key]));

      axios.put(`${API_URL}/members/${memberId}`, data)
          .then(() => window.location = '/')
          .catch((error) => console.error(error));
  };

  if (!memberData) return <p>Loading...</p>;

  return (
      <div>
          <h2>แก้ไขข้อมูลสมาชิก</h2>
          {memberData.profile_image_url && (
              <img
                  src={`${API_URL}/${memberData.profile_image_url}`}
                  alt={`${memberData.first_name} ${memberData.last_name}`}
                  style={{ width: '100px', height: '100px', objectFit: 'cover' }}
              />
          )}
          <MemberForm onSubmit={handleSubmit} memberData={memberData} />
      </div>
  );
}


function App() {
    return (
        <Router>
            <div>
                <h1>ระบบบันทึกข้อมูลสมาชิก</h1>
                <nav>
                    <Link to="/">หน้าแรก</Link> | <Link to="/add">เพิ่มสมาชิก</Link>
                </nav>
                <Routes>
                    <Route path="/" element={<MemberList />} />
                    <Route path="/add" element={<AddMember />} />
                    <Route path="/edit/:id" element={<EditMember />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
