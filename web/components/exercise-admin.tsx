'use client';

import { useEffect, useMemo, useState } from 'react';
import { REVIEW_ITEMS, type ExerciseQualityRecord, type ReviewStatus } from '@/domain/admin';

const STATUS_LABELS: Record<ReviewStatus, string> = {
  unreviewed: '未レビュー', in_review: 'レビュー中', approved: '承認済み', changes_requested: '要修正',
};
const TYPE_LABELS: Record<string, string> = {
  compare_groups: '一団比較', select_group: '一団選択', select_evidence: '根拠選択',
  urgent_or_large: '急場/大場', choose_plan: '方針選択', choose_move: '着手選択',
};

async function loadExercises() {
  const response = await fetch('/api/admin/exercises', { cache: 'no-store' });
  if (!response.ok) throw new Error('load_failed');
  return response.json() as Promise<{ exercises: ExerciseQualityRecord[] }>;
}

export default function ExerciseAdmin() {
  const [records, setRecords] = useState<ExerciseQualityRecord[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try { const result = await loadExercises(); setRecords(result.exercises); setError(null); }
    catch { setError('教材データを読み込めませんでした。'); }
  };
  useEffect(() => { void refresh(); }, []);

  const summary = useMemo(() => ({
    total: records.length,
    approved: records.filter((record) => record.review.status === 'approved').length,
    needsWork: records.filter((record) => record.review.status === 'changes_requested').length,
    enoughData: records.filter((record) => record.metrics.attemptCount >= 8).length,
  }), [records]);

  const updateRecord = (id: string, updater: (record: ExerciseQualityRecord) => ExerciseQualityRecord) =>
    setRecords((current) => current.map((record) => record.id === id ? updater(record) : record));

  const saveReview = async (record: ExerciseQualityRecord, status: ReviewStatus) => {
    setBusyId(record.id); setMessage(null); setError(null);
    try {
      const response = await fetch('/api/admin/exercises', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exerciseId: record.id, version: record.version, status, checklist: record.review.checklist, reviewerNote: record.review.reviewerNote }),
      });
      if (!response.ok) throw new Error('save_failed');
      setMessage(`${record.topic}を「${STATUS_LABELS[status]}」として保存しました。`);
      await refresh();
    } catch { setError('レビューを保存できませんでした。チェック項目を確認してください。'); }
    finally { setBusyId(null); }
  };

  return <main className="admin-page">
    <header className="admin-header"><a className="admin-brand" href="/">碁眼 <small>GO-GAN</small></a><div><span>OWNER WORKSPACE</span><h1>教材品質管理</h1><p>問題を増やす前に、正解・解説・出典・実戦自然度を同じ基準で確認します。</p></div><a className="back-to-training" href="/">診断画面へ戻る</a></header>
    <section className="quality-summary" aria-label="教材品質の概要"><article><span>登録問題</span><strong>{summary.total}</strong><small>問</small></article><article><span>承認済み</span><strong>{summary.approved}</strong><small>問</small></article><article><span>要修正</span><strong>{summary.needsWork}</strong><small>問</small></article><article><span>統計判定可能</span><strong>{summary.enoughData}</strong><small>問</small></article></section>
    <div className="quality-policy"><strong>公開品質ゲート</strong><p>5項目をすべて確認した問題だけ承認できます。回答数8件未満では、正答率による品質判断を保留します。</p></div>
    {message && <p className="admin-toast success">{message}</p>}{error && <p className="admin-toast error">{error}</p>}
    <section className="exercise-review-list">
      {!records.length && !error && <p className="admin-loading">教材を読み込んでいます…</p>}
      {records.map((record, index) => {
        const allChecked = REVIEW_ITEMS.every((item) => record.review.checklist[item.id]);
        return <article className="exercise-review-card" key={`${record.id}-${record.version}`}>
          <div className="review-card-heading"><div><span className="exercise-index">{String(index + 1).padStart(2, '0')}</span><div><p>{record.profile.category}・{record.profile.difficulty}</p><h2>{record.topic}</h2><code>{record.id} / v{record.version}</code></div></div><span className={`review-status ${record.review.status}`}>{STATUS_LABELS[record.review.status]}</span></div>
          <div className="review-card-body">
            <div className="exercise-facts"><div><span>学習目標</span><p>{record.profile.learningObjective}</p></div><div><span>問題形式</span><p>{record.stageTypes.map((type) => TYPE_LABELS[type] ?? type).join(' → ')}</p></div><div><span>診断タグ</span><p>{record.diagnosticTags.join('、')}</p></div><div><span>出典</span><p>{record.profile.source.label}（{record.profile.source.rightsStatus === 'owned' ? '自社制作' : record.profile.source.rightsStatus}）</p></div></div>
            <div className="exercise-metrics"><div><span>回答数</span><strong>{record.metrics.attemptCount}</strong></div><div><span>問題正答率</span><strong>{record.metrics.accuracy === null ? '—' : `${record.metrics.accuracy}%`}</strong></div><div><span>平均回答時間</span><strong>{record.metrics.averageResponseMs === null ? '—' : `${Math.round(record.metrics.averageResponseMs / 1000)}秒`}</strong></div></div>
            {record.alerts.length > 0 && <div className="quality-alerts"><strong>確認事項</strong>{record.alerts.map((alert) => <p key={alert}>・{alert}</p>)}</div>}
            <fieldset className="review-checklist"><legend>レビュー項目</legend>{REVIEW_ITEMS.map((item) => <label key={item.id}><input type="checkbox" checked={record.review.checklist[item.id]} onChange={(event) => updateRecord(record.id, (current) => ({ ...current, review: { ...current.review, checklist: { ...current.review.checklist, [item.id]: event.target.checked } } }))} /><span>{item.label}</span></label>)}</fieldset>
            <label className="review-note"><span>レビューコメント</span><textarea maxLength={500} rows={3} placeholder="判断が曖昧な点、修正すべき解説など" value={record.review.reviewerNote} onChange={(event) => updateRecord(record.id, (current) => ({ ...current, review: { ...current.review, reviewerNote: event.target.value } }))} /></label>
            <div className="review-actions"><button type="button" disabled={busyId === record.id} onClick={() => void saveReview(record, 'in_review')}>レビュー途中で保存</button><button className="request-changes" type="button" disabled={busyId === record.id} onClick={() => void saveReview(record, 'changes_requested')}>要修正にする</button><button className="approve" type="button" disabled={!allChecked || busyId === record.id} onClick={() => void saveReview(record, 'approved')}>{busyId === record.id ? '保存中…' : '品質確認して承認'}</button></div>
          </div>
        </article>;
      })}
    </section>
  </main>;
}
