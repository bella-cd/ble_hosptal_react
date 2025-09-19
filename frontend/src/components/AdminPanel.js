import { useState, useEffect } from "react";
import axios from "axios";

function AdminPanel() {
  const [mappings, setMappings] = useState([]);
  const [form, setForm] = useState({ esp_id: "", room: "" });
  const username = localStorage.getItem("username");

  // Fetch mappings on component mount and when username changes
  useEffect(() => {
    if (!username) return;
    axios.get("/api/esp-mapping", { headers: { "X-User": username } })
      .then(res => setMappings(res.data))
      .catch(console.error);
  }, [username]);

  // Add new mapping
  const addMapping = async () => {
    if (!form.esp_id.trim() || !form.room.trim()) {
      alert("Please fill in both ESP ID and Room");
      return;
    }
    try {
      await axios.post("/api/esp-mapping", form, { headers: { "X-User": username } });
      // Refresh mappings list
      const res = await axios.get("/api/esp-mapping", { headers: { "X-User": username } });
      setMappings(res.data);
      setForm({ esp_id: "", room: "" });
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add mapping");
    }
  };

  // Delete mapping
  const deleteMapping = async (esp_id) => {
    try {
      await axios.delete(`/api/delete-room/${esp_id}`, { headers: { "X-User": username } });
      setMappings(mappings.filter(m => m.esp_id !== esp_id));
    } catch (err) {
      alert("Failed to delete mapping");
    }
  };

  return (
    <div className="card p-4" style={{ maxWidth: 900, margin: "auto", boxShadow: "0 6px 24px #0001" }}>
      <h2>ESP Mappings</h2>
      <div className="mb-3">
        <input
          placeholder="ESP ID"
          value={form.esp_id}
          onChange={e => setForm({ ...form, esp_id: e.target.value })}
          className="form-control mb-2"
        />
        <input
          placeholder="Room"
          value={form.room}
          onChange={e => setForm({ ...form, room: e.target.value })}
          className="form-control mb-2"
        />
        <button onClick={addMapping} className="btn btn-primary">Add Mapping</button>
      </div>
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>ESP ID</th>
            <th>Room</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {mappings.length ? (
            mappings.map((m, idx) => (
              <tr key={idx}>
                <td>{m.esp_id}</td>
                <td>{m.room}</td>
                <td>
                  <button onClick={() => deleteMapping(m.esp_id)} className="btn btn-danger btn-sm">
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3" className="text-center">No mappings yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default AdminPanel;
