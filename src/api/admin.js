import api from './axios';

export const getPending = (type) =>
  api.get('/admin/pending', { params: type ? { type } : {} }).then((r) => r.data);

export const getPendingById = (id) =>
  api.get(`/admin/pending/${id}`).then((r) => r.data);

export const approvePending = (id, note) =>
  api.post(`/admin/approve/${id}`, { note }).then((r) => r.data);

export const rejectPending = (id, note) =>
  api.post(`/admin/reject/${id}`, { note }).then((r) => r.data);

export const getUnassignedStudents = (service) =>
  api.get('/admin/students/unassigned', { params: { service } }).then((r) => r.data);

export const getAvailableProfessionals = (type) =>
  api.get('/admin/professionals/available', { params: { type } }).then((r) => r.data);

export const assignTeacher = (personal_tutor_id, teacher_professional_id) =>
  api.post('/admin/assign/teacher', { personal_tutor_id, teacher_professional_id }).then((r) => r.data);

export const assignTrainer = (individual_participant_id, trainer_professional_id) =>
  api.post('/admin/assign/trainer', { individual_participant_id, trainer_professional_id }).then((r) => r.data);

export const getProfessionals = (type) =>
  api.get('/admin/professionals', { params: type ? { type } : {} }).then((r) => r.data);

export const getProfessionalById = (professionalId) =>
  api.get(`/admin/professionals/${professionalId}`).then((r) => r.data);

export const fetchDocumentBlob = (cloudinaryUrl) =>
  api.get('/admin/document-proxy', {
    params: { url: cloudinaryUrl },
    responseType: 'blob',
  }).then((r) => r.data);

export const getStudents = (type) =>
  api.get('/admin/students', { params: { type } }).then((r) => r.data);

// Commission Rules
export const getCommissionRules = () =>
  api.get('/admin/commission-rules').then((r) => r.data);

export const updateCommissionRule = (ruleKey, value) =>
  api.put(`/admin/commission-rules/${ruleKey}`, { value }).then((r) => r.data);

// Commissions
export const getCommissions = (filters) =>
  api.get('/admin/commissions', { params: filters }).then((r) => r.data);

export const approveCommission = (id) =>
  api.patch(`/admin/commissions/${id}/approve`).then((r) => r.data);

export const markCommissionPaid = (id) =>
  api.patch(`/admin/commissions/${id}/mark-paid`).then((r) => r.data);

// Travelling Allowances
export const getTravellingAllowances = (filters) =>
  api.get('/admin/travelling-allowances', { params: filters }).then((r) => r.data);

export const markTAPaid = (id) =>
  api.patch(`/admin/travelling-allowances/${id}/mark-paid`).then((r) => r.data);

export const getFeeStructures = (section) =>
  api.get('/admin/fee-structures', { params: section ? { section } : {} }).then((r) => r.data);

export const getCustomCategories = (type) =>
  api.get('/admin/fee-structures/custom-categories', { params: { type } }).then((r) => r.data);

/** Step 1 pre-check: verify number exists as admin before sending OTP */
export const checkAdmin = (mobile) =>
  api.post('/auth/check-admin', { mobile }).then((r) => r.data);

/** Step 2: exchange a Firebase phone-auth idToken for our own JWT */
export const loginWithOtp = (idToken) =>
  api.post('/auth/login', { idToken, role: 'admin' }).then((r) => r.data);

// Societies & Schools (batch dropdowns)
export const getApprovedSocieties = () =>
  api.get('/admin/societies').then((r) => r.data);

export const getSocietyById = (id) =>
  api.get(`/admin/societies/${id}`).then((r) => r.data);

export const getApprovedSchools = () =>
  api.get('/admin/schools').then((r) => r.data);

export const getSchoolById = (id) =>
  api.get(`/admin/schools/${id}`).then((r) => r.data);

// Payments
export const getPayments = (filters) =>
  api.get('/admin/payments', { params: filters }).then((r) => r.data);

export const getPayIns = (filters) =>
  api.get('/admin/payments/pay-ins', { params: filters }).then((r) => r.data);

export const getPayOuts = (filters) =>
  api.get('/admin/payments/pay-outs', { params: filters }).then((r) => r.data);

export const markRefundProcessed = (id) =>
  api.patch(`/admin/payments/refunds/${id}/mark-processed`).then((r) => r.data);

// Fee Structures mutations
export const upsertFeeStructure = (data, id) =>
  id
    ? api.put(`/admin/fee-structures/${id}`, data).then((r) => r.data)
    : api.post('/admin/fee-structures', data).then((r) => r.data);

export const deleteFeeStructure = (id) =>
  api.delete(`/admin/fee-structures/${id}`).then((r) => r.data);

export const getActivitiesByType = (coaching_type) =>
  api.get('/admin/activities', { params: { coaching_type } }).then((r) => r.data);

export const getActivities = () =>
  api.get('/admin/activities').then((r) => r.data);

export const createActivity = (formData) =>
  api.post('/admin/activities', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);

export const updateActivity = (id, formData) =>
  api.put(`/admin/activities/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);

export const deleteActivity = (id, force = false) =>
  api.delete(`/admin/activities/${id}`, { params: { force } }).then((r) => r.data);

// Batches
export const getBatches = (filters) =>
  api.get('/admin/batches', { params: filters }).then((r) => r.data);

export const getBatch = (batchId) =>
  api.get(`/admin/batches/${batchId}`).then((r) => r.data);

export const createBatch = (data) =>
  api.post('/admin/batches', data).then((r) => r.data);

export const updateBatch = (batchId, data) =>
  api.put(`/admin/batches/${batchId}`, data).then((r) => r.data);

export const deleteBatch = (batchId) =>
  api.delete(`/admin/batches/${batchId}`).then((r) => r.data);

export const deactivateBatch = (batchId) =>
  api.delete(`/admin/batches/${batchId}`).then((r) => r.data);

export const generateSessions = (batchId, { start_date_override, session_cap_override } = {}) =>
  api.post(`/admin/batches/${batchId}/generate-sessions`, {
    ...(start_date_override ? { start_date_override } : {}),
    ...(session_cap_override != null ? { session_cap_override } : {}),
  }).then((r) => r.data);

export const getBatchDetail = (batchId) =>
  api.get(`/admin/batches/${batchId}/detail`).then((r) => r.data);

export const reassignBatchSession = (batchId, sessionId, new_professional_id) =>
  api.patch(`/admin/batches/${batchId}/sessions/${sessionId}/reassign`, { new_professional_id }).then((r) => r.data);

export const reassignAllFutureBatchSessions = (batchId, new_professional_id) =>
  api.post(`/admin/batches/${batchId}/reassign-all`, { new_professional_id }).then((r) => r.data);

export const extendStudentTerm = (batchId, studentId, extra_months) =>
  api.post(`/admin/batches/${batchId}/students/${studentId}/extend-term`, { extra_months }).then((r) => r.data);

export const createBatchSession = (batchId, data) =>
  api.post(`/admin/batches/${batchId}/sessions`, data).then((r) => r.data);

export const getUnassignedBatchStudents = ({ society_id, activity_id }) =>
  api.get('/admin/batches/unassigned-students', { params: { society_id, activity_id } }).then((r) => r.data);

export const getGroupCoachingStudentsForBatch = ({ batch_id, society_id, activity_id }) =>
  api.get('/admin/students/group-coaching', { params: { batch_id, society_id, ...(activity_id ? { activity_id } : {}) } }).then((r) => r.data);

export const getSchoolBatchStudents = ({ batch_id, school_id, activity_id }) =>
  api.get('/admin/students/school-batch', { params: { batch_id, school_id, ...(activity_id ? { activity_id } : {}) } }).then((r) => r.data);

export const getBatchSettlementPreview = (batchId) =>
  api.get(`/admin/batches/${batchId}/settlement-preview`).then((r) => r.data);

export const settleBatch = (batchId) =>
  api.post(`/admin/batches/${batchId}/settle`).then((r) => r.data);

export const getBatchSettlements = (batchId) =>
  api.get(`/admin/batches/${batchId}/settlements`).then((r) => r.data);

export const markBatchSettlementPaid = (settlementId) =>
  api.patch(`/admin/batches/settlements/${settlementId}/mark-paid`).then((r) => r.data);

export const assignStudentsToBatch = (batchId, student_ids) =>
  api.post(`/admin/batches/${batchId}/students`, { student_ids }).then((r) => r.data);

export const removeStudentFromBatch = (batchId, studentId) =>
  api.delete(`/admin/batches/${batchId}/students/${studentId}`).then((r) => r.data);

// Generate individual/PT sessions (auto-generates N sessions forward)
export const generateIndividualSessions = (data) =>
  api.post('/admin/sessions/generate', data).then((r) => r.data);

export const getPreviewSessions = (params) =>
  api.get('/admin/sessions/preview', { params }).then((r) => r.data);

// Sessions
export const getSessions = (filters) =>
  api.get('/admin/sessions', { params: filters }).then((r) => r.data);

export const getSession = (sessionId) =>
  api.get(`/admin/sessions/${sessionId}`).then((r) => r.data);

export const createSession = (data) =>
  api.post('/admin/sessions', data).then((r) => r.data);

export const updateSessionStatus = (sessionId, status, cancel_reason) =>
  api.put(`/admin/sessions/${sessionId}/status`, { status, ...(cancel_reason ? { cancel_reason } : {}) }).then((r) => r.data);

export const cancelSession = (sessionId, cancel_reason) =>
  api.delete(`/admin/sessions/${sessionId}`, { data: { cancel_reason } }).then((r) => r.data);

export const rescheduleSession = (sessionId, data) =>
  api.patch(`/admin/sessions/${sessionId}/reschedule`, data).then((r) => r.data);

export const getStudentBatches = (studentId) =>
  api.get(`/admin/sessions/students/${studentId}/batches`).then((r) => r.data);

export const getAvailableProfessionalsWithTime = (type, date, start_time, end_time) =>
  api.get('/admin/professionals/available', {
    params: { type, ...(date && start_time && end_time ? { date, start_time, end_time } : {}) },
  }).then((r) => r.data);

// Student assignments overview (assigned + unassigned, read-only)
export const getStudentAssignments = (service) =>
  api.get('/admin/student-assignments', { params: service ? { service } : {} }).then((r) => r.data);

// Session creation helpers
export const getSessionStudentInfo = (type, id) =>
  api.get('/admin/sessions/student-info', { params: { type, id } }).then((r) => r.data);

export const getProfessionalsForSession = ({ type, date, start_time, end_time, subject, activity }) =>
  api.get('/admin/professionals/for-session', {
    params: { type, ...(date ? { date } : {}), ...(start_time ? { start_time } : {}), ...(end_time ? { end_time } : {}), ...(subject ? { subject } : {}), ...(activity ? { activity } : {}) },
  }).then((r) => r.data);

// Personal tutor session creation — new step-based flow
export const getStudentDetail = (studentId) =>
  api.get(`/admin/students/${studentId}`).then((r) => r.data);

export const getStudentSubjects = (studentId) =>
  api.get(`/admin/students/${studentId}/subjects`).then((r) => r.data);

export const getTeachersForSubject = (studentId, activityId, { date, start_time, end_time } = {}) =>
  api.get(`/admin/students/${studentId}/subjects/${activityId}/teachers`, {
    params: { ...(date ? { date } : {}), ...(start_time ? { start_time } : {}), ...(end_time ? { end_time } : {}) },
  }).then((r) => r.data);

export const getStudentActivities = (studentId) =>
  api.get(`/admin/students/${studentId}/activities`).then((r) => r.data);

export const getTrainersForActivity = (studentId, activityId, { date, start_time, end_time } = {}) =>
  api.get(`/admin/students/${studentId}/activities/${activityId}/trainers`, {
    params: { ...(date ? { date } : {}), ...(start_time ? { start_time } : {}), ...(end_time ? { end_time } : {}) },
  }).then((r) => r.data);

// Batches per society / school
export const getSocietyBatches = (societyId) =>
  api.get(`/admin/societies/${societyId}/batches`).then((r) => r.data);

export const getSchoolBatches = (schoolId) =>
  api.get(`/admin/schools/${schoolId}/batches`).then((r) => r.data);

// Trainer Assignments (group coaching contractual records)
export const getTrainerAssignments = (filters) =>
  api.get('/admin/assignments', { params: filters }).then((r) => r.data);

export const updateAssignmentSessionsCap = (id, sessions_allocated) =>
  api.patch(`/admin/assignments/${id}/sessions-cap`, { sessions_allocated }).then((r) => r.data);

export const deactivateAssignment = (id) =>
  api.patch(`/admin/assignments/${id}/deactivate`).then((r) => r.data);

// Settlement
export const getSettlementPreview = (professional_id) =>
  api.get('/admin/settlement/preview', { params: professional_id ? { professional_id } : {} }).then((r) => r.data);

export const confirmSettlement = ({ assignment_ids, cap_overrides } = {}) =>
  api.post('/admin/settlement/confirm', {
    ...(assignment_ids?.length ? { assignment_ids } : {}),
    ...(cap_overrides && Object.keys(cap_overrides).length ? { cap_overrides } : {}),
  }).then((r) => r.data);

export const getUnsettledCount = () =>
  api.get('/admin/settlement/unsettled-count').then((r) => r.data);

// Withdrawals
export const getWithdrawals = () =>
  api.get('/admin/withdrawals').then((r) => r.data);

export const approveWithdrawal = (professionalId) =>
  api.patch(`/admin/withdrawals/${professionalId}/approve`).then((r) => r.data);

// ME list (for dropdowns)
export const getMEList = () =>
  api.get('/admin/me-list').then((r) => r.data);

// Register society / school (multipart)
export const registerSociety = (formData) =>
  api.post('/admin/societies', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);

export const registerSchool = (formData) =>
  api.post('/admin/schools', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((r) => r.data);

// Legal Content
export const getLegalContent = (filters) =>
  api.get('/admin/legal', { params: filters }).then((r) => r.data);

export const upsertLegalContent = (data) =>
  api.post('/admin/legal', data).then((r) => r.data);

// Trainer / Teacher — Sessions & Settle tab
export const getProfessionalSessionsSettle = (professionalId) =>
  api.get(`/admin/professionals/${professionalId}/sessions-settle`).then((r) => r.data);

export const settleProfessional = (professionalId, data) =>
  api.post(`/admin/professionals/${professionalId}/settle`, data ?? {}).then((r) => r.data);

// All professionals — Payouts tab
export const getProfessionalPayouts = (professionalId) =>
  api.get(`/admin/professionals/${professionalId}/payouts`).then((r) => r.data);

// Marketing Executive — Sessions & Settle tab
export const getMESettlementPreview = (professionalId) =>
  api.get(`/admin/professionals/${professionalId}/me-settlement-preview`).then((r) => r.data);

export const getMESocietyDescribe = (professionalId, societyId) =>
  api.get(`/admin/professionals/${professionalId}/me-societies/${societyId}/describe`).then((r) => r.data);

export const settleMESociety = (professionalId, societyId) =>
  api.post(`/admin/professionals/${professionalId}/me-societies/${societyId}/settle`).then((r) => r.data);

// Vendor — Panel tab
export const getVendorPanel = (professionalId) =>
  api.get(`/admin/professionals/${professionalId}/vendor-panel`).then((r) => r.data);

export const settleVendorOrder = (professionalId, orderId) =>
  api.post(`/admin/professionals/${professionalId}/vendor-orders/${orderId}/settle`).then((r) => r.data);

// Legacy aliases (kept for any existing usage)
export const getTrainerSessionOverview = (professionalId) =>
  api.get(`/admin/professionals/${professionalId}/session-overview`).then((r) => r.data);

export const getMEOverview = (professionalId) =>
  api.get(`/admin/marketing-executives/${professionalId}/overview`).then((r) => r.data);

export const getVendorOverview = (professionalId) =>
  api.get(`/admin/vendors/${professionalId}/overview`).then((r) => r.data);

export const getTrainerSettlementPreview = (professionalId) =>
  api.get(`/admin/professionals/${professionalId}/settlement-preview`).then((r) => r.data);

export const confirmTrainerSettlement = (professionalId, data) =>
  api.post(`/admin/professionals/${professionalId}/settle`, data).then((r) => r.data);

// Support Tickets
export const getSupportTickets = (filters) =>
  api.get('/admin/support-tickets', { params: filters }).then((r) => r.data);

export const resolveTicket = (id) =>
  api.patch(`/admin/support-tickets/${id}/resolve`).then((r) => r.data);

// Sub-admin management (super_admin only)
export const getSubAdmins = () =>
  api.get('/admin/sub-admins').then((r) => r.data);

export const createSubAdmin = (data) =>
  api.post('/admin/sub-admins', data).then((r) => r.data);

export const deleteSubAdmin = (userId) =>
  api.delete(`/admin/sub-admins/${userId}`).then((r) => r.data);

// Admin User Management (super_admin only)
export const getUsers = (filters) =>
  api.get('/admin/users', { params: filters }).then((r) => r.data);

export const getUserById = (userId) =>
  api.get(`/admin/users/${userId}`).then((r) => r.data);

export const editUser = (userId, data) =>
  api.patch(`/admin/users/${userId}`, data).then((r) => r.data);

export const suspendUser = (userId, note) =>
  api.patch(`/admin/users/${userId}/suspend`, { note }).then((r) => r.data);

export const unsuspendUser = (userId) =>
  api.patch(`/admin/users/${userId}/unsuspend`).then((r) => r.data);

// Visiting Forms
export const getVisitingForms = (filters) =>
  api.get('/admin/visiting-forms', { params: filters }).then((r) => r.data);

export const getAdminProfitStats = (filters) =>
  api.get('/admin/dashboard/profit-stats', { params: filters }).then((r) => r.data);


export const getVisitingFormById = (id) =>
  api.get(`/admin/visiting-forms/${id}`).then((r) => r.data);

// Reassign single session to a different professional
export const reassignSingleSession = (sessionId, new_professional_id) =>
  api.patch(`/admin/sessions/${sessionId}/reassign`, { new_professional_id }).then((r) => r.data);

// Reassign all future scheduled sessions for a student to a different professional
export const reassignAllFutureSessions = (session_type, student_id, new_professional_id) =>
  api.post('/admin/sessions/reassign-all', { session_type, student_id, new_professional_id }).then((r) => r.data);
