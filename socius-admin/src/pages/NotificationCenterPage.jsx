import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api/client';
import Button from '../components/common/Button';
import Table from '../components/common/Table';
import { toast } from 'react-hot-toast';

const NotificationCenterPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(20);
  const [deviceCounts, setDeviceCounts] = useState({});

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const params = {
        page,
        limit: itemsPerPage,
        search: search || undefined,
      };
      const response = await api.get('/admin/users', { params });
      const { success, data } = response?.data || {};
      if (success && data && Array.isArray(data.items)) {
        const mapped = data.items.map((u) => ({
          id: String(u._id),
          name: u.fullName || '-',
          phone: u.phone || '-',
          role: u.isAvailable ? 'Volunteer' : 'User',
          accountStatus: u.accountStatus || '-',
          verificationStatus: u.verificationStatus || 'not_submitted',
        }));
        setUsers(mapped);
        setTotalItems(data.total || mapped.length);
        // Fetch device token counts for current page
        const ids = mapped.map((u) => u.id).join(',');
        if (ids) {
          try {
            const dc = await api.get('/admin/device-tokens', { params: { userIds: ids } });
            const list = dc?.data?.data || [];
            const map = {};
            list.forEach((d) => {
              map[String(d.userId)] = Number(d.count) || 0;
            });
            setDeviceCounts(map);
          } catch {
            setDeviceCounts({});
          }
        } else {
          setDeviceCounts({});
        }
      } else {
        setUsers([]);
        setTotalItems(0);
        setDeviceCounts({});
      }
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSearch = (value) => {
    setSearch(value);
    setPage(1);
    setSelectedIds([]);
    fetchUsers();
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map((u) => u.id));
    }
  };

  const handleSend = async () => {
    const trimmedTitle = title.trim();
    const trimmedBody = body.trim();
    if (!trimmedTitle || !trimmedBody) {
      toast.error('Title and message are required');
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        title: trimmedTitle,
        body: trimmedBody,
        userIds: selectedIds,
        priority: 'high',
      };
      const response = await api.post('/admin/notifications', payload);
      const { success, message, data } = response?.data || {};
      if (success) {
        const successCount = data?.successCount ?? 0;
        const failureCount = data?.failureCount ?? 0;
        const tokensFound = data?.tokensFound ?? 0;
        const targetedUserCount = (data?.targetedUserCount ?? selectedIds.length) || 0;
        const autoAttachedCount = data?.autoAttachedCount ?? 0;
        const invalidatedCount = data?.invalidatedCount ?? 0;
        const errorCode = data?.errorCode || null;
        const errorMessage = data?.errorMessage || null;
        let summary;
        // Debug info for browser console
        // eslint-disable-next-line no-console
        console.log('Admin notification result:', {
          data,
          successCount,
          failureCount,
          tokensFound,
          targetedUserCount,
          autoAttachedCount,
          invalidatedCount,
          errorCode,
          errorMessage,
        });
        if (tokensFound === 0) {
          summary = 'No active devices for selected users';
          toast.error(summary);
          return;
        }
        if (successCount === 0) {
          summary = `Failed (0/${tokensFound}).`;
          if (errorCode) {
            summary += ` Firebase error: ${errorCode}`;
          }
          if (errorMessage) {
            summary += ` - ${errorMessage}`;
          }
          toast.error(summary);
          return;
        } else {
          summary = `Delivered: ${successCount}/${tokensFound} (users: ${targetedUserCount})`;
          if (autoAttachedCount > 0) {
            summary += `, auto-linked devices for ${autoAttachedCount} user(s)`;
          }
          if (invalidatedCount > 0) {
            summary += `, invalid tokens: ${invalidatedCount}`;
          }
        }
        toast.success(summary || message || 'Notification sent');
        setTitle('');
        setBody('');
      } else {
        toast.error('Notification could not be sent.');
      }
    } catch (err) {
      const status = err?.response?.status;
      const backendMsg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.[0]?.message ||
        '';

      if (!navigator.onLine) {
        toast.error('Network error: please check your internet connection');
        return;
      }

      if (status === 404 || backendMsg.includes('Route not found')) {
        toast.error('API endpoint not found (404). Please restart the backend from this repo and refresh Admin.');
        return;
      }

      if (status === 401) {
        toast.error('Session expired or unauthorized. Please log in again.');
        return;
      }

      if (status >= 500) {
        toast.error(`Server error (${status}): ${backendMsg || 'Please try again later'}`);
        return;
      }

      toast.error(backendMsg || 'Request failed. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={users.length > 0 && selectedIds.length === users.length}
          onChange={toggleSelectAll}
        />
      ),
      accessor: 'select',
      className: 'w-10 text-center',
      render: (user) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(user.id)}
          onChange={() => toggleSelect(user.id)}
        />
      ),
    },
    { header: 'User ID', accessor: 'id' },
    { header: 'Name', accessor: 'name' },
    { header: 'Phone', accessor: 'phone' },
    { header: 'Role', accessor: 'role' },
    { 
      header: 'Devices', 
      accessor: 'devices',
      className: 'text-center',
      render: (user) => {
        const n = deviceCounts[user.id] ?? 0;
        if (n > 0) {
          return (
            <span className="inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              {n}
            </span>
          );
        }
        return (
          <span className="inline-flex items-center justify-center text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800/50 dark:text-gray-300">
            0
          </span>
        );
      }
    },
    { header: 'Account', accessor: 'accountStatus' },
    { header: 'Verification', accessor: 'verificationStatus' },
  ];

  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  return (
    <div className="flex flex-col pb-10">
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Send Notification
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Select users and send a one-time message to their devices.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => navigate('/users')}
          className="w-full md:w-auto"
        >
          View Users &amp; Volunteers
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Audience
          </h2>
          <Table
            columns={columns}
            data={users}
            loading={isLoading}
            onSearch={handleSearch}
            searchPlaceholder="Search by name or phone..."
            pagination={{
              currentPage: page,
              totalPages,
              totalItems,
              itemsPerPage,
            }}
            onPageChange={setPage}
          />
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 md:p-6 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Message
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-700 dark:text-white p-2 border"
              placeholder="For example: Service update"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Message
            </label>
            <textarea
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-socius-red focus:ring-socius-red sm:text-sm dark:bg-gray-700 dark:text-white p-2 border resize-none"
              placeholder="Short, clear message for users"
            />
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            {selectedIds.length > 0
              ? `Selected users: ${selectedIds.length}`
              : 'No users selected — message will be sent to all active users.'}
          </div>

          {(title.trim() || body.trim()) && (
            <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-xl p-3 bg-gray-900 text-gray-100">
              <p className="text-xs font-medium text-gray-400 mb-2">
                Preview (Android notification style)
              </p>
              <div className="rounded-xl bg-gray-800 px-3 py-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-5 w-5 rounded-full border border-gray-400 flex items-center justify-center text-[9px] text-gray-200">
                    L
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1 text-[11px] text-gray-400">
                      <span className="font-medium">Socius</span>
                      <span>·</span>
                      <span>now</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {title.trim()}
                    </div>
                    {body.trim() && (
                      <div className="mt-0.5 text-xs text-gray-300 whitespace-pre-line">
                        {body.trim()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            onClick={handleSend}
            loading={isSending}
            disabled={isSending}
            className="mt-2"
          >
            Send Notification
          </Button>

          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            This tool sends informational updates only. It cannot be used for
            real-time control, escalation, or emergency instructions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenterPage;
