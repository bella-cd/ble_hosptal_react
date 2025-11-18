import { useState, useEffect } from 'react';

export default function BeaconManagement() {
  const [activeBeacons, setActiveBeacons] = useState([]);
  const [inactiveBeacons, setInactiveBeacons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState(''); // 'success' or 'danger'
  const [sentBeacons, setSentBeacons] = useState({}); // Track sent beacons: { "mac_room": true }

  // Load beacons on mount
  useEffect(() => {
    loadBeacons();
    // Refresh beacons every 5 seconds
    const interval = setInterval(loadBeacons, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadBeacons = async () => {
    try {
      const username = localStorage.getItem('username');
      const res = await fetch('http://127.0.0.1:5000/api/all-beacons', {
        headers: { 'X-User': username }
      });
      const data = await res.json();
      setActiveBeacons(data.active || []);
      setInactiveBeacons(data.inactive || []);
      
      // Check if any beacons changed location - if so, clear that beacon's sent status
        setSentBeacons(prevSentBeacons => {
          const updatedSentBeacons = { ...prevSentBeacons };
          (data.active || []).forEach(beacon => {
            const mac = beacon.mac;
            const room = beacon.room;
            // If beacon was previously sent but at a different room, clear it
            Object.keys(updatedSentBeacons).forEach(key => {
              if (key.startsWith(mac + '_') && key !== `${mac}_${room}`) {
                delete updatedSentBeacons[key];
              }
            });
          });
          return updatedSentBeacons;
        });
    } catch (err) {
      console.error('Error loading beacons:', err);
      setMessage('Error loading beacons');
      setMessageType('danger');
    }
  };

  const sendActiveBeaconsToMirth = async () => {
    setLoading(true);
    try {
      const username = localStorage.getItem('username');
      
      // Check which beacons haven't been sent yet at their current location
      const newlySentBeacons = {};
      let countToSend = 0;
      let countAlreadySent = 0;
      
      activeBeacons.forEach(beacon => {
        const beaconKey = `${beacon.mac}_${beacon.room}`;
        if (sentBeacons[beaconKey]) {
          countAlreadySent++;
        } else {
          newlySentBeacons[beaconKey] = true;
          countToSend++;
        }
      });
      
      // If all beacons were already sent, just show message
      if (countToSend === 0) {
        setMessage(`All ${countAlreadySent} active beacons already sent at current locations`);
        setMessageType('warning');
        setLoading(false);
        setTimeout(() => setMessage(''), 4000);
        return;
      }
      
      // Send to backend
      const res = await fetch('http://127.0.0.1:5000/api/send-active-beacons-to-mirth', {
        method: 'POST',
        headers: { 'X-User': username }
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        // Update sent beacons tracking
        setSentBeacons({ ...sentBeacons, ...newlySentBeacons });
        const msg = countAlreadySent > 0 
          ? `✓ Sent ${data.sent_count} new beacons to Mirth (${countAlreadySent} already sent)`
          : `✓ Successfully sent ${data.sent_count} active beacons to Mirth`;
        setMessage(msg);
        setMessageType('success');
      } else {
        setMessage('✗ Error sending beacons to Mirth');
        setMessageType('danger');
      }
      
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setMessage('✗ Error sending beacons to Mirth');
      setMessageType('danger');
      console.error(err);
      setTimeout(() => setMessage(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-4" style={{ maxWidth: "900px", margin: "auto" }}>
      <h2>Beacon Management</h2>
      
      <div className="mb-3">
        <button
          onClick={sendActiveBeaconsToMirth}
          disabled={loading || activeBeacons.length === 0}
          className="btn btn-primary"
        >
          {loading ? 'Sending...' : 'Send to Mirth'}
        </button>
      </div>
      
      {message && (
        <div className={`alert alert-${messageType} mb-3`} role="alert">
          {message}
        </div>
      )}

      <h3>Active Beacons ({activeBeacons.length})</h3>
      {activeBeacons.length > 0 ? (
        <table className="table table-striped mb-4">
          <thead>
            <tr>
              <th>MAC Address</th>
              <th>Room</th>
              <th>RSSI</th>
              <th>Last Seen</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {activeBeacons.map((b) => {
              const beaconKey = `${b.mac}_${b.room}`;
              const isSent = sentBeacons[beaconKey];
              return (
                <tr key={b.mac} style={{ backgroundColor: isSent ? '#f0f0f0' : 'transparent' }}>
                  <td>{b.mac}</td>
                  <td>{b.room}</td>
                  <td>{b.rssi}</td>
                  <td>{b.time}</td>
                  <td>{isSent ? '✓ Sent' : 'Pending'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-muted fst-italic">No active beacons</p>
      )}

      <h3>Inactive Beacons ({inactiveBeacons.length})</h3>
      {inactiveBeacons.length > 0 ? (
        <table className="table table-striped">
          <thead>
            <tr>
              <th>MAC Address</th>
              <th>Whitelisted On</th>
            </tr>
          </thead>
          <tbody>
            {inactiveBeacons.map((b) => (
              <tr key={b.mac}>
                <td>{b.mac}</td>
                <td>{b.added_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-muted fst-italic">No inactive beacons</p>
      )}
    </div>
  );
}
