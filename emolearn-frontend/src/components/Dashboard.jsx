import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';

const EMOTION_COLORS = {
  anxiety:     '#EF9F27',
  excitement:  '#5DCAA5',
  sadness:     '#85B7EB',
  anger:       '#F09595',
  joy:         '#C0DD97',
  frustration: '#F5C4B3',
  pride:       '#9FE1CB',
  confusion:   '#FAC775',
  relief:      '#AFA9EC',
  hopeful:     '#5DCAA5',
  overwhelmed: '#ED93B1',
  calm:        '#B5D4F4',
  loneliness:  '#D3D1C7',
  shame:       '#F0997B',
  grief:       '#B4B2A9',
  jealousy:    '#CECBF6',
};

export default function Dashboard({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const pieRef = useRef(null);
  const lineRef = useRef(null);
  const barRef = useRef(null);
  const pieChart = useRef(null);
  const lineChart = useRef(null);
  const barChart = useRef(null);

  useEffect(() => {
    api.dashboard(userId)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    if (!data || !window.Chart) return;

    // Destroy existing charts
    [pieChart, lineChart, barChart].forEach(c => { if (c.current) { c.current.destroy(); c.current = null; } });

    const freq = data.frequency || {};
    const emotions = Object.keys(freq).sort((a, b) => freq[b] - freq[a]);
    const counts = emotions.map(e => freq[e]);
    const colors = emotions.map(e => EMOTION_COLORS[e] || '#9FE1CB');

    // Pie chart — emotion distribution
    if (pieRef.current && emotions.length > 0) {
      pieChart.current = new window.Chart(pieRef.current, {
        type: 'doughnut',
        data: {
          labels: emotions,
          datasets: [{ data: counts, backgroundColor: colors, borderWidth: 0 }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
              labels: { color: 'rgba(255,255,255,0.75)', font: { family: 'Times New Roman', size: 11 }, boxWidth: 12, padding: 10 },
            },
          },
        },
      });
    }

    // Line chart — accuracy over time
    if (lineRef.current && data.accuracy_over_time?.length > 1) {
      const labels = data.accuracy_over_time.map((_, i) => `#${i + 1}`);
      const values = data.accuracy_over_time.map(d => d.accuracy);
      lineChart.current = new window.Chart(lineRef.current, {
        type: 'line',
        data: {
          labels,
          datasets: [{
            label: 'Accuracy %',
            data: values,
            borderColor: '#5DCAA5',
            backgroundColor: 'rgba(93,202,165,0.1)',
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: '#5DCAA5',
            tension: 0.4,
            fill: true,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
            y: { min: 0, max: 100, ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          },
        },
      });
    }

    // Bar chart — top emotions
    if (barRef.current && emotions.length > 0) {
      const top = emotions.slice(0, 8);
      barChart.current = new window.Chart(barRef.current, {
        type: 'bar',
        data: {
          labels: top,
          datasets: [{
            data: top.map(e => freq[e]),
            backgroundColor: top.map(e => EMOTION_COLORS[e] || '#9FE1CB'),
            borderRadius: 4,
            borderWidth: 0,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: 'rgba(255,255,255,0.6)', font: { family: 'Times New Roman', size: 11 } }, grid: { display: false } },
            y: { ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } }, grid: { color: 'rgba(255,255,255,0.05)' } },
          },
        },
      });
    }

    return () => {
      [pieChart, lineChart, barChart].forEach(c => { if (c.current) { c.current.destroy(); c.current = null; } });
    };
  }, [data]);

  return (
    <div className="dashboard-overlay">
      <div className="dashboard-panel">

        <div className="dash-header">
          <div>
            <div className="dash-title">Your emotional journey</div>
            <div className="dash-sub">insights from your conversations with EmoLearn</div>
          </div>
          <button className="dash-close" onClick={onClose}>✕</button>
        </div>

        {loading && (
          <div className="dash-loading">Loading your data...</div>
        )}

        {!loading && (!data || data.total === 0) && (
          <div className="dash-empty">No data yet — start a conversation to see your emotional patterns here.</div>
        )}

        {!loading && data && data.total > 0 && (
          <>
            <div className="dash-stats">
              <div className="dash-stat">
                <div className="dash-stat-num">{data.total}</div>
                <div className="dash-stat-lbl">messages</div>
              </div>
              <div className="dash-stat">
                <div className="dash-stat-num">{data.accuracy !== null ? `${data.accuracy}%` : '—'}</div>
                <div className="dash-stat-lbl">accuracy</div>
              </div>
              <div className="dash-stat">
                <div className="dash-stat-num">{data.corrections}</div>
                <div className="dash-stat-lbl">corrections</div>
              </div>
              <div className="dash-stat">
                <div className="dash-stat-num">{Object.keys(data.frequency).length}</div>
                <div className="dash-stat-lbl">emotions detected</div>
              </div>
            </div>

            <div className="dash-charts">
              <div className="dash-chart-card">
                <div className="dash-chart-title">Emotion distribution</div>
                <div style={{ height: 220 }}>
                  <canvas ref={pieRef} />
                </div>
              </div>

              <div className="dash-chart-card">
                <div className="dash-chart-title">Top emotions</div>
                <div style={{ height: 220 }}>
                  <canvas ref={barRef} />
                </div>
              </div>

              <div className="dash-chart-card dash-chart-full">
                <div className="dash-chart-title">Accuracy over time</div>
                <div style={{ height: 180 }}>
                  <canvas ref={lineRef} />
                </div>
              </div>
            </div>
          </>
        )}

        <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js" />
      </div>
    </div>
  );
}
