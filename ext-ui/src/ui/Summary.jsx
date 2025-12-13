import { Pie, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useEffect, useState } from 'react';
ChartJS.register(ArcElement, Tooltip, Legend);

export function Summary({ patterns, chartRef }) {
	const [displayTotal, setDisplayTotal] = useState(0);
	const total = patterns.length;
	useEffect(() => {
		let raf; let start;
		const from = 0; const to = total; const duration = 700;
		const step = (t) => {
			if (start === undefined) start = t;
			const p = Math.min(1, (t - start) / duration);
			setDisplayTotal(Math.round(from + (to - from) * p));
			if (p < 1) raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
		return () => { if (raf) cancelAnimationFrame(raf); };
	}, [total]);
    const categories = ['Social Proof','Misdirection','Urgency','Forced Action','Obstruction','Sneaking','Scarcity','Not Dark Pattern'];
	const counts = categories.map(cat => patterns.filter(p => p.category === cat).length);
    const data = {
		labels: categories,
		datasets: [{
			data: counts,
            backgroundColor: [
                'rgba(99,102,241,0.8)',   // Social Proof - indigo
                'rgba(245,158,11,0.8)',   // Misdirection - amber
                'rgba(239,68,68,0.8)',    // Urgency - red
                'rgba(249,115,22,0.8)',   // Forced Action - orange
                'rgba(163,163,163,0.8)',  // Obstruction - gray
                'rgba(168,85,247,0.8)',   // Sneaking - purple
                'rgba(74,144,226,0.8)',   // Scarcity - blue
                'rgba(16,185,129,0.8)'    // Not Dark Pattern - emerald
            ],
            borderColor: [
                '#6366f1', '#f59e0b', '#ef4444', '#f97316',
                '#a3a3a3', '#a855f7', '#4a90e2', '#10b981'
            ],
            borderWidth: 2,
            hoverBorderWidth: 3,
            hoverBorderColor: '#ffffff',
            hoverOffset: 8,
		}],
	};
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '85%',
        plugins: {
            legend: { 
                position: 'bottom', 
                labels: { 
                    boxWidth: 12, 
                    color: 'var(--text)',
                    font: {
                        size: 11,
                        weight: '600'
                    },
                    padding: 15,
                    usePointStyle: true,
                    pointStyle: 'circle'
                } 
            },
            tooltip: { 
                enabled: true,
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#ffffff',
                bodyColor: '#e2e8f0',
                borderColor: 'rgba(74, 144, 226, 0.3)',
                borderWidth: 1,
                cornerRadius: 12,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            },
        },
        elements: {
            arc: {
                borderWidth: 0,
            }
        },
        animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1200,
            easing: 'easeOutQuart'
        }
    };
    return (
		<section className="summary">
			<div className="cards">
				<div className="metric">
					<div className="label">Total patterns</div>
					<div className="value">{displayTotal}</div>
				</div>
                <div className="chart">
                    <div className="chart-container">
                        <Doughnut ref={chartRef} data={data} options={options} />
                    </div>
				</div>
			</div>
		</section>
	);
}


