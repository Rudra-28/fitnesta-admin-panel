import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import * as adminApi from '@/api/admin';

export function usePending(type) {
  return useQuery({
    queryKey: ['pending', type ?? 'all'],
    queryFn: () => adminApi.getPending(type),
  });
}

export function useApprovePending() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }) => adminApi.approvePending(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending'] }),
  });
}

export function useRejectPending() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }) => adminApi.rejectPending(id, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pending'] }),
  });
}

export function useProfessionals(type) {
  return useQuery({
    queryKey: ['professionals', type ?? 'all'],
    queryFn: () => adminApi.getProfessionals(type),
  });
}

export function useProfessionalById(professionalId) {
  return useQuery({
    queryKey: ['professional', professionalId],
    queryFn: () => adminApi.getProfessionalById(professionalId),
    enabled: !!professionalId,
  });
}

export function useStudents(type) {
  return useQuery({
    queryKey: ['students', type],
    queryFn: () => adminApi.getStudents(type),
    enabled: !!type,
  });
}

export function useUnassignedStudents(service) {
  return useQuery({
    queryKey: ['students', 'unassigned', service],
    queryFn: () => adminApi.getUnassignedStudents(service),
  });
}

export function useAvailableProfessionals(type) {
  return useQuery({
    queryKey: ['professionals', 'available', type],
    queryFn: () => adminApi.getAvailableProfessionals(type),
  });
}

export function useAssignTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ personal_tutor_id, teacher_professional_id }) =>
      adminApi.assignTeacher(personal_tutor_id, teacher_professional_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['professionals', 'available'] });
    },
  });
}

export function useAssignTrainer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ individual_participant_id, trainer_professional_id }) =>
      adminApi.assignTrainer(individual_participant_id, trainer_professional_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['professionals', 'available'] });
    },
  });
}

export function useCommissionRules() {
  return useQuery({
    queryKey: ['commission-rules'],
    queryFn: adminApi.getCommissionRules,
  });
}

export function useUpdateCommissionRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ruleKey, value }) => adminApi.updateCommissionRule(ruleKey, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commission-rules'] }),
  });
}

export function useCommissions(filters) {
  return useQuery({
    queryKey: ['commissions', filters],
    queryFn: () => adminApi.getCommissions(filters),
  });
}

export function useApproveCommission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.approveCommission(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions'] }),
  });
}

export function useMarkCommissionPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.markCommissionPaid(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commissions'] }),
  });
}

export function useTravellingAllowances(filters) {
  return useQuery({
    queryKey: ['travelling-allowances', filters],
    queryFn: () => adminApi.getTravellingAllowances(filters),
  });
}

export function useFeeStructures(section) {
  return useQuery({
    queryKey: ['fee-structures', section ?? 'all'],
    queryFn: () => adminApi.getFeeStructures(section),
  });
}

export function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: adminApi.getActivities,
  });
}

export function useCreateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) => adminApi.createActivity(formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
}

export function useUpdateActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, formData }) => adminApi.updateActivity(id, formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
}

export function useDeleteActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force }) => adminApi.deleteActivity(id, force),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });
}

export function useMarkTAPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.markTAPaid(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['travelling-allowances'] }),
  });
}

// Batches
export function useBatches(filters) {
  return useQuery({
    queryKey: ['batches', filters],
    queryFn: () => adminApi.getBatches(filters),
  });
}

export function useBatch(batchId) {
  return useQuery({
    queryKey: ['batch', batchId],
    queryFn: () => adminApi.getBatch(batchId),
    enabled: !!batchId,
  });
}

export function useBatchDetail(batchId) {
  return useQuery({
    queryKey: ['batch-detail', batchId],
    queryFn: () => adminApi.getBatchDetail(batchId),
    enabled: !!batchId,
  });
}

export function useReassignBatchSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, sessionId, new_professional_id }) =>
      adminApi.reassignBatchSession(batchId, sessionId, new_professional_id),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ['batch-detail', batchId] });
    },
  });
}

export function useReassignAllFutureBatchSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, new_professional_id }) =>
      adminApi.reassignAllFutureBatchSessions(batchId, new_professional_id),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ['batch-detail', batchId] });
      qc.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useUnassignedBatchStudents({ society_id, activity_id } = {}) {
  return useQuery({
    queryKey: ['unassigned-batch-students', society_id, activity_id],
    queryFn: () => adminApi.getUnassignedBatchStudents({ society_id, activity_id }),
    enabled: !!(society_id && activity_id),
  });
}

export function useGroupCoachingStudentsForBatch({ batch_id, society_id, activity_id } = {}) {
  return useQuery({
    queryKey: ['group-coaching-students-for-batch', batch_id, society_id, activity_id],
    queryFn: () => adminApi.getGroupCoachingStudentsForBatch({ batch_id, society_id, activity_id }),
    enabled: !!(batch_id && society_id),
  });
}

export function useSchoolBatchStudents({ batch_id, school_id, activity_id } = {}) {
  return useQuery({
    queryKey: ['school-batch-students', batch_id, school_id, activity_id],
    queryFn: () => adminApi.getSchoolBatchStudents({ batch_id, school_id, activity_id }),
    enabled: !!(batch_id && school_id),
  });
}

export function useBatchSettlementPreview(batchId) {
  return useQuery({
    queryKey: ['batch-settlement-preview', batchId],
    queryFn: () => adminApi.getBatchSettlementPreview(batchId),
    enabled: !!batchId,
  });
}

export function useSettleBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId) => adminApi.settleBatch(batchId),
    onSuccess: (_, batchId) => {
      qc.invalidateQueries({ queryKey: ['batch-detail', batchId] });
      qc.invalidateQueries({ queryKey: ['batch-settlement-preview', batchId] });
      qc.invalidateQueries({ queryKey: ['batch-settlements', batchId] });
    },
  });
}

export function useBatchSettlements(batchId) {
  return useQuery({
    queryKey: ['batch-settlements', batchId],
    queryFn: () => adminApi.getBatchSettlements(batchId),
    enabled: !!batchId,
  });
}

export function useMarkBatchSettlementPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ settlementId }) => adminApi.markBatchSettlementPaid(settlementId),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ['batch-settlements', batchId] });
      qc.invalidateQueries({ queryKey: ['batch-detail', batchId] });
    },
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => adminApi.createBatch(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batches'] }),
  });
}

export function useUpdateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, data }) => adminApi.updateBatch(batchId, data),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['batch', batchId] });
    },
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId) => adminApi.deleteBatch(batchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batches'] }),
  });
}

export function useDeactivateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId) => adminApi.deactivateBatch(batchId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['batches'] }),
  });
}

export function useGenerateSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, start_date_override, session_cap_override }) =>
      adminApi.generateSessions(batchId, { start_date_override, session_cap_override }),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['batch', batchId] });
      qc.invalidateQueries({ queryKey: ['batch-detail', batchId] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useAssignStudentsToBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, student_ids }) =>
      adminApi.assignStudentsToBatch(batchId, student_ids),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ['batch', batchId] });
      qc.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export function useRemoveStudentFromBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, studentId }) =>
      adminApi.removeStudentFromBatch(batchId, studentId),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ['batch', batchId] });
      qc.invalidateQueries({ queryKey: ['batches'] });
    },
  });
}

export const useGenerateIndividualSessions = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => adminApi.generateIndividualSessions(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['student-batches'] });
    },
  });
};

export const usePreviewSessions = (params) => {
  return useQuery({
    queryKey: ['sessions-preview', params],
    queryFn: () => adminApi.getPreviewSessions(params),
    enabled: !!(params?.session_type && params?.student_id && params?.start_date && params?.days_of_week?.length > 0),
    retry: false,
  });
};

// Sessions
export function useSessions(filters) {
  return useQuery({
    queryKey: ['sessions', filters],
    queryFn: () => adminApi.getSessions(filters),
  });
}

export function useSession(sessionId) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => adminApi.getSession(sessionId),
    enabled: !!sessionId,
  });
}

export function useCreateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => adminApi.createSession(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['student-assignments'] });
      qc.invalidateQueries({ queryKey: ['student-batches'] });
    },
  });
}

export function useUpdateSessionStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, status, cancel_reason }) =>
      adminApi.updateSessionStatus(sessionId, status, cancel_reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['student-batches'] });
    },
  });
}

export function useCancelSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, cancel_reason }) =>
      adminApi.cancelSession(sessionId, cancel_reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['student-batches'] });
    },
  });
}

export function useRescheduleSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, scheduled_date, start_time, end_time }) =>
      adminApi.rescheduleSession(sessionId, { scheduled_date, start_time, end_time }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['student-batches'] });
    },
  });
}

export function useReassignSingleSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, new_professional_id }) =>
      adminApi.reassignSingleSession(sessionId, new_professional_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['student-batches'] });
    },
  });
}

export function useReassignAllFutureSessions() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ session_type, student_id, new_professional_id }) =>
      adminApi.reassignAllFutureSessions(session_type, student_id, new_professional_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] });
      qc.invalidateQueries({ queryKey: ['student-batches'] });
      qc.invalidateQueries({ queryKey: ['students'] });
    },
  });
}

export function useStudentBatches(studentId) {
  return useQuery({
    queryKey: ['student-batches', studentId],
    queryFn: () => adminApi.getStudentBatches(studentId),
    enabled: !!studentId,
  });
}

export function useAvailableProfessionalsWithTime(type, date, start_time, end_time) {
  const hasTimeFilter = !!(date && start_time && end_time);
  return useQuery({
    queryKey: ['professionals', 'available', type, hasTimeFilter ? { date, start_time, end_time } : null],
    queryFn: () => adminApi.getAvailableProfessionalsWithTime(
      type,
      hasTimeFilter ? date : undefined,
      hasTimeFilter ? start_time : undefined,
      hasTimeFilter ? end_time : undefined,
    ),
    enabled: !!type,
    placeholderData: keepPreviousData,
  });
}

export function useStudentAssignments(service) {
  return useQuery({
    queryKey: ['student-assignments', service ?? 'all'],
    queryFn: () => adminApi.getStudentAssignments(service),
    enabled: !!service,
  });
}

export function useSessionStudentInfo(type, id) {
  return useQuery({
    queryKey: ['session-student-info', type, id],
    queryFn: () => adminApi.getSessionStudentInfo(type, id),
    enabled: !!(type && id),
  });
}

export function useProfessionalsForSession({ type, date, start_time, end_time, subject, activity }) {
  return useQuery({
    queryKey: ['professionals', 'for-session', { type, date, start_time, end_time, subject, activity }],
    queryFn: () => adminApi.getProfessionalsForSession({ type, date, start_time, end_time, subject, activity }),
    enabled: !!type,
    placeholderData: keepPreviousData,
  });
}

export function useStudentDetail(studentId) {
  return useQuery({
    queryKey: ['student-detail', studentId],
    queryFn: () => adminApi.getStudentDetail(studentId),
    enabled: !!studentId,
  });
}

export function useStudentSubjects(studentId) {
  return useQuery({
    queryKey: ['student-subjects', String(studentId)],
    queryFn: () => adminApi.getStudentSubjects(studentId),
    enabled: !!studentId,
    staleTime: 0,
    throwOnError: false,
    onError: (err) => console.error('[useStudentSubjects] fetch failed:', err?.response?.data ?? err),
  });
}

export function useTeachersForSubject(studentId, activityId, { date, start_time, end_time } = {}) {
  return useQuery({
    queryKey: ['teachers-for-subject', studentId, activityId, { date, start_time, end_time }],
    queryFn: () => adminApi.getTeachersForSubject(studentId, activityId, { date, start_time, end_time }),
    enabled: !!(studentId && activityId),
    placeholderData: keepPreviousData,
    throwOnError: false,
    onError: (err) => console.error('[useTeachersForSubject] fetch failed:', err?.response?.data ?? err),
  });
}

export function useStudentActivities(studentId) {
  return useQuery({
    queryKey: ['student-activities', String(studentId)],
    queryFn: () => adminApi.getStudentActivities(studentId),
    enabled: !!studentId,
    staleTime: 0,
    throwOnError: false,
    onError: (err) => console.error('[useStudentActivities] fetch failed:', err?.response?.data ?? err),
  });
}

export function useTrainersForActivity(studentId, activityId, { date, start_time, end_time } = {}) {
  return useQuery({
    queryKey: ['trainers-for-activity', studentId, activityId, { date, start_time, end_time }],
    queryFn: () => adminApi.getTrainersForActivity(studentId, activityId, { date, start_time, end_time }),
    enabled: !!(studentId && activityId),
    placeholderData: keepPreviousData,
    throwOnError: false,
    onError: (err) => console.error('[useTrainersForActivity] fetch failed:', err?.response?.data ?? err),
  });
}

export function useSocieties() {
  return useQuery({ queryKey: ['societies'], queryFn: adminApi.getApprovedSocieties });
}

export function useSociety(id) {
  return useQuery({
    queryKey: ['society', id],
    queryFn: () => adminApi.getSocietyById(id),
    enabled: !!id,
  });
}

export function useSchools() {
  return useQuery({ queryKey: ['schools'], queryFn: adminApi.getApprovedSchools });
}

export function useSchool(id) {
  return useQuery({
    queryKey: ['school', id],
    queryFn: () => adminApi.getSchoolById(id),
    enabled: !!id,
  });
}

export function usePayments(filters) {
  return useQuery({
    queryKey: ['payments', filters],
    queryFn: () => adminApi.getPayments(filters),
  });
}

export function usePayIns(filters) {
  return useQuery({
    queryKey: ['pay-ins', filters],
    queryFn: () => adminApi.getPayIns(filters),
  });
}

export function usePayOuts(filters) {
  return useQuery({
    queryKey: ['pay-outs', filters],
    queryFn: () => adminApi.getPayOuts(filters),
  });
}

export function useMarkRefundProcessed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.markRefundProcessed(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pay-outs'] }),
  });
}

export function useCustomCategories(type) {
  return useQuery({
    queryKey: ['custom-categories', type],
    queryFn: () => adminApi.getCustomCategories(type),
    enabled: !!type,
  });
}

export function useUpsertFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ data, id }) => adminApi.upsertFeeStructure(data, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fee-structures'] }),
  });
}

export function useDeleteFeeStructure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.deleteFeeStructure(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fee-structures'] }),
  });
}

export function useSocietyBatches(societyId) {
  return useQuery({
    queryKey: ['society-batches', societyId],
    queryFn: () => adminApi.getSocietyBatches(societyId),
    enabled: !!societyId,
  });
}

export function useSchoolBatches(schoolId) {
  return useQuery({
    queryKey: ['school-batches', schoolId],
    queryFn: () => adminApi.getSchoolBatches(schoolId),
    enabled: !!schoolId,
  });
}

// Trainer Assignments
export function useTrainerAssignments(filters) {
  return useQuery({
    queryKey: ['trainer-assignments', filters],
    queryFn: () => adminApi.getTrainerAssignments(filters),
  });
}

export function useUpdateAssignmentSessionsCap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, sessions_allocated }) => adminApi.updateAssignmentSessionsCap(id, sessions_allocated),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer-assignments'] }),
  });
}

export function useDeactivateAssignment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.deactivateAssignment(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainer-assignments'] }),
  });
}

// Settlement
export function useSettlementPreview(professionalId) {
  return useQuery({
    queryKey: ['settlement-preview', professionalId ?? null],
    queryFn: () => adminApi.getSettlementPreview(professionalId),
  });
}

export function useConfirmSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => adminApi.confirmSettlement(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settlement-preview'] });
      qc.invalidateQueries({ queryKey: ['commissions'] });
      qc.invalidateQueries({ queryKey: ['trainer-assignments'] });
    },
  });
}

export function useUnsettledCount() {
  return useQuery({
    queryKey: ['unsettled-count'],
    queryFn: adminApi.getUnsettledCount,
  });
}

// ME list
export function useMEList() {
  return useQuery({ queryKey: ['me-list'], queryFn: adminApi.getMEList });
}

// Register society / school
export function useRegisterSociety() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) => adminApi.registerSociety(formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['societies'] }),
  });
}

export function useRegisterSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (formData) => adminApi.registerSchool(formData),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schools'] }),
  });
}

// New per-professional endpoints
export function useProfessionalSessionsSettle(professionalId) {
  return useQuery({
    queryKey: ['prof-sessions-settle', professionalId],
    queryFn: () => adminApi.getProfessionalSessionsSettle(professionalId),
    enabled: !!professionalId,
    retry: false,
  });
}

export function useSettleProfessional() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ professionalId, data }) => adminApi.settleProfessional(professionalId, data),
    onSuccess: (_, { professionalId }) => {
      qc.invalidateQueries({ queryKey: ['prof-sessions-settle', professionalId] });
      qc.invalidateQueries({ queryKey: ['trainer-settlement-preview', professionalId] });
      qc.invalidateQueries({ queryKey: ['prof-payouts', professionalId] });
    },
  });
}

export function useProfessionalPayouts(professionalId) {
  return useQuery({
    queryKey: ['prof-payouts', professionalId],
    queryFn: () => adminApi.getProfessionalPayouts(professionalId),
    enabled: !!professionalId,
    retry: false,
  });
}

export function useMESettlementPreview(professionalId) {
  return useQuery({
    queryKey: ['me-settle-preview', professionalId],
    queryFn: () => adminApi.getMESettlementPreview(professionalId),
    enabled: !!professionalId,
    retry: false,
  });
}

export function useMESocietyDescribe(professionalId, societyId) {
  return useQuery({
    queryKey: ['me-society-describe', professionalId, societyId],
    queryFn: () => adminApi.getMESocietyDescribe(professionalId, societyId),
    enabled: !!professionalId && !!societyId,
    retry: false,
  });
}

export function useSettleMESociety() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ professionalId, societyId }) => adminApi.settleMESociety(professionalId, societyId),
    onSuccess: (_, { professionalId }) => {
      qc.invalidateQueries({ queryKey: ['me-settle-preview', professionalId] });
      qc.invalidateQueries({ queryKey: ['prof-payouts', professionalId] });
    },
  });
}

export function useVendorPanel(professionalId) {
  return useQuery({
    queryKey: ['vendor-panel', professionalId],
    queryFn: () => adminApi.getVendorPanel(professionalId),
    enabled: !!professionalId,
    retry: false,
  });
}

export function useSettleVendorOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ professionalId, orderId }) => adminApi.settleVendorOrder(professionalId, orderId),
    onSuccess: (_, { professionalId }) => {
      qc.invalidateQueries({ queryKey: ['vendor-panel', professionalId] });
      qc.invalidateQueries({ queryKey: ['prof-payouts', professionalId] });
    },
  });
}

// Trainer session overview & settlement
export function useTrainerSessionOverview(professionalId) {
  return useQuery({
    queryKey: ['trainer-session-overview', professionalId],
    queryFn: () => adminApi.getTrainerSessionOverview(professionalId),
    enabled: !!professionalId,
    retry: false,
  });
}

export function useMEOverview(professionalId) {
  return useQuery({
    queryKey: ['me-overview', professionalId],
    queryFn: () => adminApi.getMEOverview(professionalId),
    enabled: !!professionalId,
    retry: false,
  });
}

export function useVendorOverview(professionalId) {
  return useQuery({
    queryKey: ['vendor-overview', professionalId],
    queryFn: () => adminApi.getVendorOverview(professionalId),
    enabled: !!professionalId,
    retry: false,
  });
}

export function useTrainerSettlementPreview(professionalId) {
  return useQuery({
    queryKey: ['trainer-settlement-preview', professionalId],
    queryFn: () => adminApi.getTrainerSettlementPreview(professionalId),
    enabled: !!professionalId,
    retry: false,
  });
}

export function useConfirmTrainerSettlement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ professionalId, data }) => adminApi.confirmTrainerSettlement(professionalId, data),
    onSuccess: (_, { professionalId }) => {
      qc.invalidateQueries({ queryKey: ['trainer-settlement-preview', professionalId] });
      qc.invalidateQueries({ queryKey: ['trainer-session-overview', professionalId] });
      qc.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
}

// PT Cycle Settlement
export function usePtSettlement(professionalId) {
  return useQuery({
    queryKey: ['pt-settlement', professionalId],
    queryFn: () => adminApi.getPtSettlement(professionalId),
    enabled: !!professionalId,
    retry: false,
  });
}

export function useSettlePtCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cycleId, professional_id }) => adminApi.settlePtCycle(cycleId, professional_id),
    onSuccess: (_, { professional_id }) => {
      qc.invalidateQueries({ queryKey: ['pt-settlement', professional_id] });
      qc.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
}

// IC Cycle Settlement
export function useIcSettlement(professionalId) {
  return useQuery({
    queryKey: ['ic-settlement', professionalId],
    queryFn: () => adminApi.getIcSettlement(professionalId),
    enabled: !!professionalId,
    retry: false,
  });
}

export function useSettleIcCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cycleId, professional_id }) => adminApi.settleIcCycle(cycleId, professional_id),
    onSuccess: (_, { professional_id }) => {
      qc.invalidateQueries({ queryKey: ['ic-settlement', professional_id] });
      qc.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
}

// Batch Cycle Settlement (society + school)
export function useSocietySettlement(professionalId) {
  return useQuery({
    queryKey: ['society-settlement', professionalId],
    queryFn: () => adminApi.getSocietySettlement(professionalId),
    enabled: !!professionalId,
    retry: false,
  });
}

export function useSchoolSettlement(professionalId) {
  return useQuery({
    queryKey: ['school-settlement', professionalId],
    queryFn: () => adminApi.getSchoolSettlement(professionalId),
    enabled: !!professionalId,
    retry: false,
  });
}

export function useSettleBatchCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ cycleId }) => adminApi.settleBatchCycle(cycleId),
    onSuccess: (_, { professionalId }) => {
      qc.invalidateQueries({ queryKey: ['society-settlement', professionalId] });
      qc.invalidateQueries({ queryKey: ['school-settlement', professionalId] });
      qc.invalidateQueries({ queryKey: ['commissions'] });
    },
  });
}

// Extend cycles
export function useExtendBatchCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId }) => adminApi.extendBatchCycle(batchId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['society-settlement'] });
      qc.invalidateQueries({ queryKey: ['school-settlement'] });
      qc.invalidateQueries({ queryKey: ['batch-settlements'] });
    },
  });
}

export function useExtendPtCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ personalTutorId }) => adminApi.extendPtCycle(personalTutorId),
    onSuccess: (_, { professionalId }) => {
      qc.invalidateQueries({ queryKey: ['pt-settlement', professionalId] });
    },
  });
}

export function useExtendIcCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ individualParticipantId }) => adminApi.extendIcCycle(individualParticipantId),
    onSuccess: (_, { professionalId }) => {
      qc.invalidateQueries({ queryKey: ['ic-settlement', professionalId] });
    },
  });
}

// Support Tickets
export function useSupportTickets(filters) {
  return useQuery({
    queryKey: ['support-tickets', filters],
    queryFn: () => adminApi.getSupportTickets(filters),
  });
}

export function useResolveTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => adminApi.resolveTicket(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support-tickets'] }),
  });
}

// Legal Content
export function useLegalContent(filters) {
  return useQuery({
    queryKey: ['legal-content', filters],
    queryFn: () => adminApi.getLegalContent(filters),
  });
}

export function useUpsertLegalContent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => adminApi.upsertLegalContent(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['legal-content'] }),
  });
}

export function useWithdrawals() {
  return useQuery({
    queryKey: ['withdrawals'],
    queryFn: adminApi.getWithdrawals,
  });
}

export function useApproveWithdrawal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (professionalId) => adminApi.approveWithdrawal(professionalId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['withdrawals'] }),
  });
}

// Visiting Forms
export function useVisitingForms(filters) {
  return useQuery({
    queryKey: ['visiting-forms', filters],
    queryFn: () => adminApi.getVisitingForms(filters),
  });
}

export function useVisitingFormById(id) {
  return useQuery({
    queryKey: ['visiting-form', id],
    queryFn: () => adminApi.getVisitingFormById(id),
    enabled: !!id,
  });
}

// Analytics 
export function useProfitStats(filters) {
  return useQuery({
    queryKey: ['profit-stats', filters],
    queryFn: () => adminApi.getAdminProfitStats(filters),
  });
}



export function useExtendStudentTerm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, studentId, extra_months }) =>
      adminApi.extendStudentTerm(batchId, studentId, extra_months),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ['batch-detail', batchId] });
    },
  });
}

export function useCreateBatchSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, ...data }) =>
      adminApi.createBatchSession(batchId, data),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ['batch-detail', batchId] });
    },
  });
}

export function useAddSessionToCycle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => adminApi.addSessionToCycle(data),
    onSuccess: (_, { professional_id }) => {
      qc.invalidateQueries({ queryKey: ['trainer-settlement-preview', professional_id] });
      qc.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
