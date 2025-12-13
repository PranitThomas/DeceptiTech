import { Pie, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useEffect, useState, useMemo } from 'react';
ChartJS.register(ArcElement, Tooltip, Legend);

export function Summary({ patterns, chartRef }) {
	const [displayTotal, setDisplayTotal] = useState(0);
	const total = patterns.length;
	const isDark = useMemo(() => {
		const root = document.querySelector('.deceptitech-root');
		return root?.getAttribute('data-theme') === 'dark';
	}, []);
	
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
                    boxWidth: 14, 
                    color: isDark ? '#ffffff' : '#0b1020',
                    font: {
                        size: 13,
                        weight: '700',
                        family: 'Inter, Poppins, system-ui, sans-serif'
                    },
                    padding: 18,
                    usePointStyle: true,
                    pointStyle: 'circle',
                    generateLabels: function(chart) {
                        const data = chart.data;
                        if (data.labels.length && data.datasets.length) {
                            return data.labels.map((label, i) => {
                                const value = data.datasets[0].data[i];
                                return {
                                    text: label,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    strokeStyle: data.datasets[0].borderColor[i],
                                    lineWidth: 2,
                                    hidden: false,
                                    index: i
                                };
                            });
                        }
                        return [];
                    }
                } 
            },
            tooltip: { 
                enabled: true,
                backgroundColor: isDark ? 'rgba(30, 35, 50, 0.98)' : 'rgba(15, 23, 42, 0.95)',
                titleColor: '#ffffff',
                bodyColor: '#f1f3f8',
                borderColor: 'rgba(74, 144, 226, 0.5)',
                borderWidth: 1,
                cornerRadius: 12,
                displayColors: true,
                titleFont: { size: 13, weight: '700' },
                bodyFont: { size: 12, weight: '600' },
                padding: 12,
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


