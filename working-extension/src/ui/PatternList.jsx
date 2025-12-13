import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiAlertTriangle, FiClock, FiMessageCircle, FiDollarSign, FiUsers, FiShuffle, FiSlash, FiEyeOff, FiCheckCircle } from 'react-icons/fi';

function Badge({ category }) {
    const Icon = {
        'Social Proof': FiUsers,
        Misdirection: FiShuffle,
        Urgency: FiAlertTriangle,
        'Forced Action': FiAlertTriangle,
        Obstruction: FiSlash,
        Sneaking: FiEyeOff,
        Scarcity: FiClock,
        Confirmshaming: FiMessageCircle,
        'Hidden Costs': FiDollarSign,
        'Not Dark Pattern': FiCheckCircle,
    }[category] || FiMessageCircle;
    return (
        <span className="badge" data-cat={category}>
            <Icon /> {category}
        </span>
    );
}

function ConfidenceBar({ value }) {
    const pct = Math.round(value * 100);
    return (
        <div className="conf">
            <div className="conf-bar">
                <div className="fill" style={{ ['--to']: `${pct}%` }} />
            </div>
            <div className="conf-pct">{pct}%</div>
        </div>
    );
}

export function PatternList({ items }) {
	return (
		<div className="pattern-list">
			{items.map(item => (
				<PatternCard key={item.id} item={item} />
			))}
		</div>
	);
}

function PatternCard({ item }) {
	const [open, setOpen] = useState(false);
    const CategoryIcon = {
        'Social Proof': FiUsers,
        Misdirection: FiShuffle,
        Urgency: FiAlertTriangle,
        'Forced Action': FiAlertTriangle,
        Obstruction: FiSlash,
        Sneaking: FiEyeOff,
        Scarcity: FiClock,
        Confirmshaming: FiMessageCircle,
        'Hidden Costs': FiDollarSign,
        'Not Dark Pattern': FiCheckCircle,
    }[item.category] || FiMessageCircle;
	return (
		<motion.article
            className="pattern-card"
            data-cat={item.category}
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
		>
			<header className="pc-header" onClick={() => setOpen(v => !v)}>
				<Badge category={item.category} />
				<div className="snippet">{item.snippet}</div>
				<ConfidenceBar value={item.confidence} />
				<FiChevronDown className={open ? 'chev open' : 'chev'} />
			</header>
			<div className="pc-reason">{item.reason}</div>
			<AnimatePresence>
				{open && (
					<motion.div
						className="pc-details"
						initial={{ height: 0, opacity: 0 }}
						animate={{ height: 'auto', opacity: 1 }}
						exit={{ height: 0, opacity: 0 }}
					>
                        <div className="pc-detail-head">
                            <span className="pc-detail-icon"><CategoryIcon /></span>
                            <span className="pc-detail-label">Insight</span>
                        </div>
                        <div className="pc-detail-body">{item.details}</div>
					</motion.div>
				)}
			</AnimatePresence>
		</motion.article>
	);
}


