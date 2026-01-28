import { useState, useEffect } from 'react';
import api from '../utils/api';

function CheckIn({ user }) {
    const [clients, setClients] = useState([]);
    const [team, setTeam] = useState([]);
    const [selectedClient, setSelectedClient] = useState('');
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [notes, setNotes] = useState('');
    const [location, setLocation] = useState(null);
    const [activeCheckin, setActiveCheckin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        fetchData();
        getCurrentLocation();
    }, []);

    const fetchData = async () => {
        try {
            const requests = [
                api.get('/checkin/clients'),
                api.get('/checkin/active')
            ];

            if (user?.role === 'manager') {
                requests.push(api.get('/users/team'));
            }

            const [clientsRes, activeRes, teamRes] = await Promise.all(requests);

            // DEBUG: Set state only if API call succeeds
            if (clientsRes?.data?.success) setClients(clientsRes.data.data);
            if (activeRes?.data?.success) setActiveCheckin(activeRes.data.data);
            if (teamRes?.data?.success) setTeam(teamRes.data.data);
        } catch (err) {
            // DEBUG: Display fetch errors clearly
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    // DEBUG: Location logic unchanged, just ensure fallback exists
    const getCurrentLocation = () => {
        if (!navigator.geolocation) {
            setLocation({ latitude: 28.4595, longitude: 77.0266 });
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({
                    latitude: +pos.coords.latitude.toFixed(6),
                    longitude: +pos.coords.longitude.toFixed(6)
                });
            },
            () => {
                setLocation({ latitude: 28.4595, longitude: 77.0266 });
            }
        );
    };

    const handleCheckIn = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setSubmitting(true);

        // DEBUG: Prevent check-in if location not ready
        if (!location) {
            setError('Fetching location, please wait...');
            setSubmitting(false);
            return;
        }

        try {
            const payload = {
                client_id: selectedClient,
                latitude: location.latitude,
                longitude: location.longitude,
                notes
            };

            if (user.role === 'manager') payload.employee_id = selectedEmployee;

            const res = await api.post('/checkin', payload);

            // DEBUG: Handle success & error explicitly
            if (res.data.success) {
                setSuccess('Checked in successfully!');
                setSelectedClient('');
                setSelectedEmployee('');
                setNotes('');
                fetchData(); // Refresh active check-in & clients
            } else {
                setError(res.data.message);
            }
        } catch (err) {
            // DEBUG: Capture backend errors
            setError(err.response?.data?.message || 'Check-in failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCheckOut = async () => {
        setSubmitting(true);
        setError('');
        setSuccess('');

        try {
            const res = await api.put('/checkin/checkout');

            // DEBUG: Explicit success/error handling
            if (res.data.success) {
                setSuccess('Checked out successfully!');
                setActiveCheckin(null);
            } else {
                setError(res.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Checkout failed');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full"></div>
            </div>
        );
    }

    return (
        <div>
            <h2 className="text-2xl font-bold mb-6">Check In / Out</h2>

            {/* DEBUG: Show error/success messages */}
            {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">{error}</div>}
            {success && <div className="bg-green-100 text-green-700 p-3 mb-4 rounded">{success}</div>}

            {/* Active Check-in */}
            {activeCheckin ? (
                <div className="bg-blue-50 p-6 rounded mb-6">
                    <p>Checked in at <strong>{activeCheckin.client_name}</strong></p>
                    <button
                        onClick={handleCheckOut}
                        disabled={submitting}
                        className="mt-4 bg-red-600 text-white px-6 py-2 rounded"
                    >
                        {submitting ? 'Processing...' : 'Check Out'}
                    </button>
                </div>
            ) : (
                <form onSubmit={handleCheckIn} className="bg-white p-6 rounded shadow">
                    {user.role === 'manager' && (
                        <div className="mb-4">
                            <label className="block mb-2">Select Employee</label>
                            <select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                className="w-full border p-2 rounded"
                                required
                            >
                                <option value="">Choose employee</option>
                                {team.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block mb-2">Select Client</label>
                        <select
                            value={selectedClient}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className="w-full border p-2 rounded"
                            required
                        >
                            <option value="">Choose client</option>
                            {clients.map(c => (
                                <option key={c.id} value={c.id}>{c.name} - {c.address}</option>
                            ))}
                        </select>
                    </div>

                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full border p-2 rounded mb-4"
                        placeholder="Notes (optional)"
                    />

                    {/* DEBUG: disable submit until all validation passes */}
                    <button
                        type="submit"
                        disabled={
                            submitting ||
                            !selectedClient ||
                            !location ||
                            (user.role === 'manager' && !selectedEmployee)
                        }
                        className="w-full bg-blue-600 text-white py-2 rounded"
                    >
                        {submitting ? 'Checking in...' : 'Check In'}
                    </button>
                </form>
            )}
        </div>
    );
}

export default CheckIn;
