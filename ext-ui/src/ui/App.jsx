import { useMemo, useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShield, FiSearch, FiX, FiDownload, FiFilter, FiPlay, FiSun, FiMoon, FiCheckCircle, FiLink } from 'react-icons/fi';
import classNames from 'classnames';
import './styles.css';
import { Summary } from './Summary';
import { PatternList } from './PatternList';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function App() {
	const [isOpen, setIsOpen] = useState(false);
	// URL removed - will use current page context instead
	const [patterns, setPatterns] = useState([]);
	const [filters, setFilters] = useState({ category: 'all', sort: 'confidence-desc' });
    const panelRef = useRef(null);
    const chartRef = useRef(null);
	const [isScanning, setIsScanning] = useState(false);
	const [theme, setTheme] = useState('light');
	const [toasts, setToasts] = useState([]);

	function pushToast(message) {
		const id = Math.random().toString(36).slice(2);
		setToasts(t => [...t, { id, message }]);
		setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2200);
	}

	const filtered = useMemo(() => {
		let list = [...patterns];
		if (filters.category !== 'all') {
			list = list.filter(p => p.category === filters.category);
		}
		if (filters.sort === 'confidence-desc') list.sort((a,b) => b.confidence - a.confidence);
		if (filters.sort === 'confidence-asc') list.sort((a,b) => a.confidence - b.confidence);
		return list;
	}, [patterns, filters]);

	function handleScanSubmit(e) {
		if (e) e.preventDefault();
		setIsOpen(true);
		setIsScanning(true);
		// Simulated results
		setTimeout(() => {
			setPatterns([
				{ id: '1', category: 'Urgency', snippet: 'Only 1 item left! Offer ends in 2 minutes', confidence: 0.92, reason: 'Uses countdown timers to pressure decisions.', details: 'The page displays a countdown timer and low stock indicator to induce FOMO.' },
				{ id: '2', category: 'Scarcity', snippet: '23 people are viewing this right now', confidence: 0.81, reason: 'Implied high demand to rush purchase.', details: 'Social proof combined with scarcity increases pressure to buy quickly.' },
				{ id: '3', category: 'Social Proof', snippet: '1,245 people purchased this today', confidence: 0.64, reason: 'Uses herd behavior to influence action.', details: 'Large social proof counters push urgency and desirability.' },
				{ id: '4', category: 'Misdirection', snippet: 'Primary action styled to accept marketing', confidence: 0.59, reason: 'Visual hierarchy nudges unwanted choice.', details: 'Accept is bright while Decline is low-contrast link.' },
				{ id: '5', category: 'Forced Action', snippet: 'Must create account to view prices', confidence: 0.71, reason: 'Blocks progress until unrelated action taken.', details: 'Gates core info behind registration.' },
				{ id: '6', category: 'Obstruction', snippet: 'Cancel requires calling customer support', confidence: 0.62, reason: 'Makes opt-out intentionally hard.', details: 'No online cancel—adds friction in the flow.' },
				{ id: '7', category: 'Sneaking', snippet: 'Extra protection plan preselected', confidence: 0.66, reason: 'Adds items without explicit consent.', details: 'Checkbox selected by default.' },
				{ id: '8', category: 'Not Dark Pattern', snippet: 'Transparent pricing shown upfront', confidence: 0.52, reason: 'Good practice example.', details: 'All fees visible before checkout.' },
			]);
			setIsScanning(false);
		}, 900);
	}


    async function handleDownloadPDF() {
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        
        // Set default font and improve quality
        pdf.setFont('helvetica', 'normal');

        // Cover page with enhanced styling
        pdf.setFillColor(11, 16, 32);
        pdf.rect(0, 0, pageWidth, 160, 'F');
        
        // Title with better typography
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(24);
        pdf.text('DeceptiTech', 50, 50);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(16);
        pdf.setTextColor(230, 230, 230);
        pdf.text('Dark Pattern Detection Report', 50, 70);
        
        // URL section with better formatting
        pdf.setFontSize(12);
        pdf.setTextColor(180, 190, 210);
        pdf.setFont('helvetica', 'italic');
        const urlText = `Analyzed URL: ${window.location.href}`;
        const urlLines = pdf.splitTextToSize(urlText, pageWidth - 100);
        pdf.text(urlLines, 50, 95);
        
        // Date and separator
        const currentDate = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', month: 'long', day: 'numeric' 
        });
        pdf.text(`Generated: ${currentDate}`, 50, 115);
        
        pdf.setDrawColor(74, 144, 226);
        pdf.setLineWidth(2);
        pdf.line(50, 130, pageWidth - 50, 130);

        // Summary section with improved layout
        let y = 180;
        pdf.setTextColor(30, 30, 30);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.text('Executive Summary', 50, y);
        
        // Chart integration
        if (chartRef.current && chartRef.current.canvas) {
            const chartCanvas = chartRef.current.canvas;
            const chartImg = chartCanvas.toDataURL('image/png', 1.0);
            const cW = 200; const cH = 200;
            pdf.addImage(chartImg, 'PNG', pageWidth - 60 - cW, y + 20, cW, cH);
        }
        
        // Category breakdown with better formatting
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        const totals = [
            'Social Proof','Misdirection','Urgency','Forced Action','Obstruction','Sneaking','Scarcity','Not Dark Pattern'
        ].map(cat => ({ cat, count: patterns.filter(p => p.category === cat).length }));
        
        let ty = y + 30;
        const totalFound = patterns.length;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.text(`Total Patterns Detected: ${totalFound}`, 50, ty);
        ty += 25;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        totals.forEach((t, index) => {
            if (t.count > 0) {
                pdf.setTextColor(74, 144, 226);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`${t.cat}:`, 50, ty);
                pdf.setTextColor(50, 50, 50);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`${t.count} instances`, 180, ty);
                ty += 16;
            }
        });

        // New page for detailed findings
        pdf.addPage();
        pdf.setTextColor(30, 30, 30);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(18);
        pdf.text('Detailed Analysis', 50, 40);
        
        let dy = 70;
        const lineHeight = 14;
        const maxWidth = pageWidth - 100;
        const cardPadding = 15;
        
        patterns.forEach((p, idx) => {
            // Check if we need a new page
            const estimatedHeight = 120; // Approximate height per pattern
            if (dy + estimatedHeight > pageHeight - 50) {
                pdf.addPage();
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(16);
                pdf.text('Detailed Analysis (continued)', 50, 40);
                dy = 70;
            }
            
            // Pattern header with category and confidence
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(12);
            pdf.setTextColor(74, 144, 226);
            pdf.text(`Pattern ${idx + 1}: ${p.category}`, 50, dy);
            pdf.setTextColor(100, 100, 100);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.text(`Confidence: ${Math.round(p.confidence * 100)}%`, 200, dy);
            
            dy += 18;
            
            // Pattern snippet
            pdf.setTextColor(30, 30, 30);
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(10);
            pdf.text('Snippet:', 50, dy);
            dy += 12;
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(60, 60, 60);
            const snippetLines = pdf.splitTextToSize(`"${p.snippet}"`, maxWidth);
            pdf.text(snippetLines, 50, dy);
            dy += snippetLines.length * lineHeight + 8;
            
            // Reason
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(30, 30, 30);
            pdf.text('Analysis:', 50, dy);
            dy += 12;
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(60, 60, 60);
            const reasonLines = pdf.splitTextToSize(p.reason, maxWidth);
            pdf.text(reasonLines, 50, dy);
            dy += reasonLines.length * lineHeight + 8;
            
            // Details
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(30, 30, 30);
            pdf.text('Details:', 50, dy);
            dy += 12;
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(60, 60, 60);
            const detailLines = pdf.splitTextToSize(p.details, maxWidth);
            pdf.text(detailLines, 50, dy);
            dy += detailLines.length * lineHeight + 20;
            
            // Subtle separator line
            if (idx < patterns.length - 1) {
                pdf.setDrawColor(220, 220, 220);
                pdf.setLineWidth(0.5);
                pdf.line(50, dy - 10, pageWidth - 50, dy - 10);
            }
        });

        // Footer on last page
        const pageCount = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(150, 150, 150);
            pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 80, pageHeight - 20);
            pdf.text('Generated by DeceptiTech', 50, pageHeight - 20);
        }

        pdf.save('deceptitech-report.pdf');
        pushToast('Professional report exported as PDF');
    }

	return (
		<div className="deceptitech-root" data-theme={theme} style={{ pointerEvents: 'auto' }}>
			<AnimatePresence initial={false}>
				{!isOpen && (
					<motion.div
						className="widget-card"
						initial={{ opacity: 0, y: 20, scale: 0.98 }}
						animate={{ opacity: 1, y: 0, scale: 1 }}
						exit={{ opacity: 0, y: 10 }}
						whileHover={{ boxShadow: '0 8px 30px rgba(79,70,229,0.25)' }}
					>
                        <div className="widget-header">
							<div className="radar" />
							<div className="icon-badge">
								<FiSearch />
								<FiShield className="shield" />
							</div>
                            <div className="title">DeceptiTech <span className="title-acc">Scanner</span></div>
						</div>
                        <div className="widget-form">
                            <div className="scan-info">
                                <span className="scan-icon"><FiShield /></span>
                                <div className="scan-text">
                                    <div className="scan-title">Ready to scan current page</div>
                                    <div className="scan-subtitle">Click scan to analyze this webpage for dark patterns</div>
                                </div>
                            </div>
                            <button className="gradient-btn scan-btn" onClick={handleScanSubmit}><FiPlay /> Scan Current Page</button>
						</div>
					</motion.div>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{isOpen && (
					<motion.aside
						className="report-panel"
						ref={panelRef}
						initial={{ x: '100%' }}
						animate={{ x: 0 }}
						exit={{ x: '100%' }}
						transition={{ type: 'spring', stiffness: 200, damping: 24 }}
					>
                        <header className="panel-header">
							<div className="brand">
                                <div className="logo">
                                    <FiShield />
                                    <span className="ring" />
                                    <span className="dot" />
                                </div>
								<div className="brand-text">
                                    <div className="brand-title">DeceptiTech – Detect Hidden Dark Patterns Instantly</div>
									<div className="brand-sub">Scan results for current page</div>
								</div>
							</div>
							<div className="panel-actions">
								<button className="ghost" title="Export PDF" onClick={handleDownloadPDF}><FiDownload /> PDF</button>
								<button className="icon" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} aria-label="Toggle theme">{theme === 'light' ? <FiMoon /> : <FiSun />}</button>
								<button className="icon" onClick={() => setIsOpen(false)} aria-label="Close"><FiX /></button>
							</div>
						</header>

						<div className="panel-body">
                            <Summary patterns={patterns} chartRef={chartRef} />

							<div className="controls">
								<div className="left">
									<FiFilter />
							<select value={filters.category} onChange={(e)=> setFilters(f => ({...f, category: e.target.value}))}>
								<option value="all">All categories</option>
								<option>Social Proof</option>
								<option>Misdirection</option>
								<option>Urgency</option>
								<option>Forced Action</option>
								<option>Obstruction</option>
								<option>Sneaking</option>
								<option>Scarcity</option>
								<option>Not Dark Pattern</option>
							</select>
								</div>
								<div className="right">
									<select value={filters.sort} onChange={(e)=> setFilters(f => ({...f, sort: e.target.value}))}>
										<option value="confidence-desc">Sort by confidence (high → low)</option>
										<option value="confidence-asc">Sort by confidence (low → high)</option>
									</select>
								</div>
							</div>

							{isScanning ? (
								<div className="pattern-list">
									{Array.from({ length: 3 }).map((_, i) => (
										<div key={i} className="pattern-card skeleton">
											<div className="pc-header">
												<div className="s-badge" />
												<div className="s-line" />
												<div className="s-bar" />
											</div>
											<div className="s-sub" />
										</div>
									))}
								</div>
							) : (
								<PatternList items={filtered} />
							)}
						</div>

						<div className="toast-container">
							{toasts.map(t => (
								<div key={t.id} className="toast"><FiCheckCircle /> {t.message}</div>
							))}
						</div>
					</motion.aside>
				)}
			</AnimatePresence>
		</div>
	);
}


