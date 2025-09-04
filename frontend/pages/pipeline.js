import { useEffect, useRef, useState } from "react";
import { api, connectWS } from "../lib/api";
import Link from "next/link";
import ReactDOM from 'react-dom';
import { Button, Card, Badge, Input, Select } from "../components/ui";
import { useToast } from '../lib/toast';

// Confetti for success states
let confettiFn = null;
if (typeof window !== 'undefined') {
  import('canvas-confetti').then(m => { confettiFn = m.default; }).catch(()=>{});
}

// Available pipeline stages that can be added to applications
const AVAILABLE_STAGES = [
  { id: 'applied', name: 'Applied', icon: 'mail', category: 'initial' },
  { id: 'phone-screen', name: 'Phone Screen', icon: 'phone', category: 'interview' },
  { id: 'hr-round', name: 'HR Round', icon: 'users', category: 'interview' },
  { id: 'tech-1', name: 'Tech Interview 1', icon: 'code', category: 'interview' },
  { id: 'tech-2', name: 'Tech Interview 2', icon: 'wrench', category: 'interview' },
  { id: 'system-design', name: 'System Design', icon: 'building', category: 'interview' },
  { id: 'coding-challenge', name: 'Coding Challenge', icon: 'keyboard', category: 'interview' },
  { id: 'take-home', name: 'Take Home Assignment', icon: 'home', category: 'interview' },
  { id: 'case-study', name: 'Case Study', icon: 'chart-bar', category: 'interview' },
  { id: 'presentation', name: 'Presentation', icon: 'presentation', category: 'interview' },
  { id: 'culture-fit', name: 'Culture Fit', icon: 'leaf', category: 'interview' },
  { id: 'team-match', name: 'Team Match', icon: 'handshake', category: 'interview' },
  { id: 'founder-chat', name: 'Founder Chat', icon: 'user-tie', category: 'interview' },
  { id: 'bar-raiser', name: 'Bar Raiser', icon: 'star', category: 'interview' },
  { id: 'partner-interview', name: 'Partner Interview', icon: 'user-group', category: 'interview' },
  { id: 'final-round', name: 'Final Round', icon: 'target', category: 'interview' },
  { id: 'on-site', name: 'On-site', icon: 'building-office', category: 'interview' },
  { id: 'reference-check', name: 'Reference Check', icon: 'clipboard', category: 'verification' },
  { id: 'background-check', name: 'Background Check', icon: 'magnifying-glass', category: 'verification' },
  { id: 'offer', name: 'Offer', icon: 'gift', category: 'final' },
  { id: 'negotiation', name: 'Negotiation', icon: 'briefcase', category: 'final' },
  { id: 'accepted', name: 'Accepted', icon: 'check-circle', category: 'final' },
  { id: 'rejected', name: 'Rejected', icon: 'x-circle', category: 'final' },
  { id: 'withdrawn', name: 'Withdrawn', icon: 'ban', category: 'final' }
];

// Default pipeline stages 
const DEFAULT_STAGES = ['Applied', 'Phone Screen', 'Tech', 'On-site', 'Offer', 'Accepted', 'Rejected'];

// 2a) helper to make pill classes
const pill = (base) =>
  `text-white ${base} border border-white/20 shadow-sm`;

// Function to render SVG icons for pipeline stages
const renderIcon = (iconName) => {
  const iconMap = {
    mail: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    phone: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
    users: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
    code: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    wrench: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    building: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    keyboard: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    home: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    'chart-bar': (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    presentation: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
      </svg>
    ),
    leaf: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
      </svg>
    ),
    handshake: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6V11m0-5.5v-1a1.5 1.5 0 00-1.5-1.5H5.5A1.5 1.5 0 004 5.5v1M7 11.5V14m0-2.5c0-1.5 1.5-3 3-3s3 1.5 3 3m-3-3V11m0-5.5v-1a1.5 1.5 0 011.5-1.5H14.5A1.5 1.5 0 0116 5.5v1M7 14h10M10 14v2.5A1.5 1.5 0 0011.5 18h1a1.5 1.5 0 001.5-1.5V14M10 14v-2.5A1.5 1.5 0 0111.5 11h1A1.5 1.5 0 0114 12.5V14m-4 0h4" />
      </svg>
    ),
    'user-tie': (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    star: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    'user-group': (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    target: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'building-office': (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    clipboard: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    'magnifying-glass': (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    gift: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
    briefcase: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0V8a2 2 0 01-2 2H8a2 2 0 01-2-2V6m8 0H8m0 0V4" />
      </svg>
    ),
    'check-circle': (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'x-circle': (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    ban: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
      </svg>
    )
  };
  return iconMap[iconName] || iconMap.clipboard;
};

const statusConfig = {
  Applied:       { color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',           icon: renderIcon('mail'),              gradient: 'from-[#12274D] to-[#0E1A33]', bgColor: 'bg-[#3D7BFF]' },
  'Phone Screen':{ color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           icon: renderIcon('phone'),             gradient: 'from-[#3B2A00] to-[#1C1400]', bgColor: 'bg-amber-500' },
  'HR Round':    { color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           icon: renderIcon('users'),             gradient: 'from-[#08363B] to-[#06252A]', bgColor: 'bg-cyan-500' },
  Tech:          { color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           icon: renderIcon('code'),              gradient: 'from-[#2B1B46] to-[#1A112E]', bgColor: 'bg-violet-600' },
  'Tech Interview 1': { color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',      icon: renderIcon('code'),              gradient: 'from-[#2B1B46] to-[#1A112E]', bgColor: 'bg-violet-600' },
  'Tech Interview 2': { color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',      icon: renderIcon('wrench'),            gradient: 'from-[#2B1B46] to-[#1A112E]', bgColor: 'bg-violet-600' },
  'System Design':{ color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',          icon: renderIcon('building'),          gradient: 'from-[#162853] to-[#0F1C3B]', bgColor: 'bg-indigo-600' },
  'Coding Challenge':{ color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',       icon: renderIcon('keyboard'),          gradient: 'from-[#08361F] to-[#062616]', bgColor: 'bg-emerald-600' },
  'Take Home Assignment':{ color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',   icon: renderIcon('home'),              gradient: 'from-[#122E52] to-[#0E223D]', bgColor: 'bg-sky-600' },
  'Case Study':  { color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           icon: renderIcon('chart-bar'),         gradient: 'from-[#063640] to-[#04242B]', bgColor: 'bg-cyan-600' },
  Presentation:  { color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           icon: renderIcon('presentation'),      gradient: 'from-[#4C1133] to-[#2B0A1E]', bgColor: 'bg-fuchsia-600' },
  'Culture Fit': { color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           icon: renderIcon('leaf'),              gradient: 'from-[#084326] to-[#062F1B]', bgColor: 'bg-green-600' },
  'Team Match':  { color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           icon: renderIcon('handshake'),         gradient: 'from-[#083A3A] to-[#062929]', bgColor: 'bg-teal-600' },
  'Founder Chat':{ color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           icon: renderIcon('user-tie'),          gradient: 'from-[#4B240A] to-[#2E1606]', bgColor: 'bg-orange-600' },
  'Bar Raiser':  { color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           icon: renderIcon('star'),              gradient: 'from-[#4A1038] to-[#2B0A22]', bgColor: 'bg-pink-600' },
  'Partner Interview':{ color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',      icon: renderIcon('user-group'),        gradient: 'from-[#430F18] to-[#29090F]', bgColor: 'bg-rose-600' },
  'Final Round': { color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           icon: renderIcon('target'),            gradient: 'from-[#2B1B46] to-[#1A112E]', bgColor: 'bg-violet-600' },
  'On-site':     { color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           icon: renderIcon('building-office'),   gradient: 'from-[#162853] to-[#0F1C3B]', bgColor: 'bg-indigo-600' },
  'Reference Check':{ color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',        icon: renderIcon('clipboard'),         gradient: 'from-[#3E2D00] to-[#231A00]', bgColor: 'bg-amber-600' },
  'Background Check':{ color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',       icon: renderIcon('magnifying-glass'),  gradient: 'from-[#3E3400] to-[#221D00]', bgColor: 'bg-yellow-600' },
  Offer:         { color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',           icon: renderIcon('gift'),              gradient: 'from-[#0A4327] to-[#072F1C]', bgColor: 'bg-emerald-600' },
  Negotiation:   { color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',           icon: renderIcon('briefcase'),         gradient: 'from-[#122B4F] to-[#0C1D35]', bgColor: 'bg-blue-600' },
  Accepted:      { color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',           icon: renderIcon('check-circle'),      gradient: 'from-[#0A4B30] to-[#073523]', bgColor: 'bg-emerald-600' },
  Rejected:      { color: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',           icon: renderIcon('x-circle'),          gradient: 'from-[#4A0E1E] to-[#2C0913]', bgColor: 'bg-rose-600' },
  Withdrawn:     { color: 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',           icon: renderIcon('ban'),               gradient: 'from-[#222] to-[#161616]',     bgColor: 'bg-neutral-600' },
};
const DEFAULT_STATUS_STYLE = { color: 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300', icon: renderIcon('clipboard'), gradient: 'from-[#1a1a1a] to-[#111]', bgColor: 'bg-neutral-600' };

function ApplicationCard({ application, onMove, onDelete, onUpdate, statuses, onDragStart, onDragEnd, viewMode = 'board' }) {
  const [isDragging, setIsDragging] = useState(false);
  const [showJobDetail, setShowJobDetail] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const config = statusConfig[application.status] || DEFAULT_STATUS_STYLE;




  const availableStatuses = statuses.filter(s => s !== application.status);

  const handleDragStart = (e) => {
    console.log('🚀 DRAG START EVENT FIRED!', application.id, application.job.title);
    console.log('Event type:', e.type, 'Target:', e.target.tagName);
    console.log('DataTransfer available:', !!e.dataTransfer);
    
    setIsDragging(true);
    
    try {
      e.dataTransfer.setData('text/plain', JSON.stringify({
        id: application.id,
        currentStatus: application.status
      }));
      e.dataTransfer.effectAllowed = 'move';
      console.log('✅ Drag data set successfully');
    } catch (error) {
      console.error('❌ Error setting drag data:', error);
    }
    
    onDragStart && onDragStart(application);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd && onDragEnd();
  };

  const formatDate = (dateString) => {
    console.log('formatDate received:', dateString, typeof dateString);
    if (!dateString) {
      console.log('No date string provided');
      return 'Date not available';
    }
    
    try {
      const date = new Date(dateString);
      console.log('Parsed date:', date, 'isValid:', !isNaN(date.getTime()));
      
      if (isNaN(date.getTime())) {
        console.log('Invalid date, returning fallback');
        return 'Invalid Date';
      }
      
      const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      console.log('Formatted date:', formatted);
      return formatted;
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Date Error';
    }
  };

  const getDaysAgo = (dateString) => {
    console.log('getDaysAgo received:', dateString);
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const result = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      console.log('Days ago result:', result);
      return result;
    } catch (error) {
      console.error('Error calculating days ago:', error);
      return 'N/A';
    }
  };

  // Debug logging for date issues
  useEffect(() => {
    console.log('=== Application Debug Info ===');
    console.log('Application ID:', application.id);
    console.log('All application fields:', Object.keys(application));
    console.log('created_at value:', application.created_at);
    console.log('updated_at value:', application.updated_at);
    console.log('Full application object:', application);
    console.log('===========================');
  }, [application]);

  return (
    <>
    <Card 
      className={`
        glass-card group hover:border-white/20 transition-all duration-300 animate-slideIn overflow-hidden relative
        ${viewMode === 'board' ? 'text-sm' : ''}
      `}
      style={{
        animationDelay: `${Math.random() * 200}ms`,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
      padding={false}
    >
      {/* Delete button - moved to top-left for board mode */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (window.confirm('Are you sure you want to delete this application?')) {
            onDelete(application.id);
          }
        }}
        className={`absolute p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-full transition-all duration-300 z-10 backdrop-blur-sm border border-red-400/30 hover:border-red-300/50 ${
          viewMode === 'board' ? 'top-2 left-2' : 'top-2 right-2'
        }`}
        title="Delete application"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3,6 5,6 21,6"></polyline>
          <path d="M19,6V20a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6M8,6V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2V6"></path>
          <line x1="10" y1="11" x2="10" y2="17"></line>
          <line x1="14" y1="11" x2="14" y2="17"></line>
        </svg>
      </button>

      <div className={viewMode === 'board' ? 'p-3 pt-8' : 'p-6'}> {/* Smaller padding and top space for board mode */}
        {/* Header with Job Title and Status */}
        <div className={viewMode === 'board' ? 'mb-4' : 'mb-4'}>
          {/* Title Row */}
          <div className={`${viewMode === 'board' ? 'mb-3 text-center' : 'mb-3'}`}>
            <h3 className={`font-bold text-slate-100 group-hover:text-indigo-400 transition-colors leading-tight ${
              viewMode === 'board' ? 'text-base line-clamp-2 px-2' : 'text-xl'
            }`}>
              {application.job?.title || 'Unknown Position'}
            </h3>
          </div>
          
          {/* Company Info */}
          {(application.job?.company?.name || application.job?.company_name) && (
            <div className={`${viewMode === 'board' ? 'mb-3 text-center' : 'mb-3'}`}>
              <div className={`flex items-center space-x-1 ${viewMode === 'board' ? 'justify-center px-2' : ''}`}>
                <span className={viewMode === 'board' ? 'text-sm' : ''}>🏢</span>
                <span className={`font-medium text-indigo-400 ${
                  viewMode === 'board' 
                    ? 'text-sm truncate max-w-[120px]' 
                    : 'text-sm truncate'
                }`}>
                  {application.job?.company?.name || application.job?.company_name}
                </span>
              </div>
            </div>
          )}
          
          {/* Additional Info for Cards Mode Only */}
          {viewMode !== 'board' && (
            <div className="flex items-center flex-wrap gap-2 text-sm text-slate-300">
              {application.job?.location && (
                <div className="flex items-center space-x-1">
                  <span>📍</span>
                  <span>{application.job.location}</span>
                </div>
              )}
              {application.job?.salary_min && application.job?.salary_max && (
                <div className="flex items-center space-x-1">
                  <span>💰</span>
                  <span className="font-medium text-green-400">
                    ${application.job.salary_min.toLocaleString()} - ${application.job.salary_max.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Drag Handle - Only show in board mode */}
        {viewMode === 'board' && (
          <div className="flex items-center justify-center mb-3">
            <div 
              className="text-gray-400 hover:text-gray-300 cursor-grab active:cursor-grabbing p-2 hover:bg-white/10 rounded-lg transition-all border border-white/10" 
              title="Drag to move"
              draggable="true"
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
              </svg>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className={`${viewMode === 'board' ? 'pt-2 border-t border-white/10' : 'pt-4 border-t border-white/10'}`}>
          {viewMode === 'board' ? (
            <div className="space-y-2">
              <div className="text-xs text-slate-300 text-center">
                {getDaysAgo(application.created_at)}
              </div>
              <div className="flex flex-col space-y-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-cyan-400 border-cyan-400/50 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-300 text-xs py-1.5 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowJobDetail(true);
                  }}
                >
                  👁️ View
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-500/80 to-pink-500/80 border border-purple-400/50 text-white hover:from-purple-500 hover:to-pink-500 transition-all duration-300 text-xs py-1.5 w-full"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNoteModal(true);
                  }}
                >
                  📝 Note
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300 flex-shrink-0">
                {getDaysAgo(application.created_at)}
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-cyan-400 border-cyan-400/50 bg-cyan-500/10 hover:bg-cyan-500/20 hover:border-cyan-400 transition-all duration-300 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowJobDetail(true);
                  }}
                >
                  <span className="mr-1">👁️</span>
                  View
                </Button>
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-purple-500/80 to-pink-500/80 border border-purple-400/50 text-white hover:from-purple-500 hover:to-pink-500 hover:shadow-lg hover:shadow-purple-500/25 transition-all duration-300 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowNoteModal(true);
                  }}
                >
                  <span className="mr-1">📝</span>
                  Note
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
    
    {/* Modals rendered outside the Card */}
    {/* Job Detail Modal */}
    {showJobDetail && (
      <JobDetailModal 
        application={application}
        onClose={() => setShowJobDetail(false)}
      />
    )}
    
    {/* Note Modal */}
    {showNoteModal && (
      <NoteModal 
        application={application}
        onClose={() => setShowNoteModal(false)}
      />
    )}
    </>
  );
}

function Column({ status, items, onMove, onDelete, onUpdate, availableStatuses, draggedItem, onDragStart, onDragEnd, stageNumber }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isDropAllowed, setIsDropAllowed] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  const config = statusConfig[status] || DEFAULT_STATUS_STYLE;
  
  // Sort by date (newest first)
  const sortedItems = [...items].sort((a, b) => {
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  
  // Progressive disclosure logic
  const INITIAL_SHOW_COUNT = 5;
  const shouldShowExpansion = sortedItems.length > INITIAL_SHOW_COUNT;
  const visibleItems = showAll ? sortedItems : sortedItems.slice(0, INITIAL_SHOW_COUNT);
  const hiddenCount = sortedItems.length - INITIAL_SHOW_COUNT;
  
  // Ensure items is always an array
  const safeItems = Array.isArray(items) ? items : [];
  
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 Drag enter column:', status);
    setIsDragOver(true);
    setIsDropAllowed(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🎯 Drag over column:', status);
    
    // Always allow drop - we'll check validity on drop
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
    setIsDropAllowed(true);
  };

  const handleDragLeave = (e) => {
    // Only reset if leaving the column entirely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
      setIsDropAllowed(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    setIsDropAllowed(false);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (data.currentStatus !== status) {
        onMove(data.id, status);
      }
    } catch (error) {
      console.error('Drop failed:', error);
    }
  };

  const getColumnStats = () => {
    const totalSalary = safeItems.reduce((sum, item) => {
      const min = item.job?.salary_min || 0;
      const max = item.job?.salary_max || 0;
      return sum + ((min + max) / 2);
    }, 0);
    
    const avgSalary = safeItems.length > 0 ? Math.round(totalSalary / safeItems.length) : 0;
    
    return {
      count: safeItems.length,
      avgSalary: avgSalary > 0 ? avgSalary : null
    };
  };

  const stats = getColumnStats();
  
  return (
    <div className="w-full h-full">
      <div 
        className={`glass-card rounded-2xl border transition-all duration-300 overflow-hidden h-full flex flex-col backdrop-blur-md ${
          isDragOver 
            ? isDropAllowed 
              ? 'border-green-400/60 shadow-lg shadow-green-500/20 scale-[1.02] bg-green-500/10' 
              : 'border-red-400/60 shadow-lg shadow-red-500/20 bg-red-500/10'
            : 'border-white/20 hover:border-indigo-400/30 shadow-xl'
        }`}
        style={{ minHeight: '500px', maxHeight: '75vh' }}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Column Header */}
        <div className={`p-4 border-b border-white/10 flex-shrink-0 bg-gradient-to-br ${config.gradient} text-white`} data-stage-anchor>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white ring-2 ring-white/30 shadow-lg flex-shrink-0 ${
                statusConfig[status]?.bgColor || 'bg-gray-500'
              }`}>
                {stageNumber}
              </div>
              <div className="flex items-center space-x-2 flex-1 min-w-0">
                <span className="text-lg flex-shrink-0">{config.icon}</span>
                <h3 className="font-bold text-white text-sm truncate">{status}</h3>
              </div>
            </div>
            <div className="flex items-center space-x-2 flex-shrink-0">
              <Badge 
                variant="default" 
                size="sm" 
                className="px-2 py-1 text-xs bg-white/20 text-white border-white/30 font-semibold shadow-sm"
              >
                {items.length}
              </Badge>
              {shouldShowExpansion && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="p-1.5 text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                  title={showAll ? 'Show less' : `Show ${hiddenCount} more`}
                >
                  <svg 
                    className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          {/* Column Stats - More Prominent */}
          {stats.count > 0 && stats.avgSalary && (
            <div className="flex items-center gap-2 text-sm text-white/90">
              <div className="bg-white/25 text-white px-2 py-1 rounded-lg text-xs font-medium shadow-sm">
                💰 ${Math.round(stats.avgSalary/1000)}k avg
              </div>
            </div>
          )}
        </div>

        {/* Drop Zone Indicator */}
        {isDragOver && (
          <div className={`p-2 text-center border-2 border-dashed ${
            isDropAllowed
              ? 'border-emerald-400 bg-emerald-400/20 text-emerald-100'
              : 'border-red-400 bg-red-400/20 text-red-100'
          }`}>
            <div className="text-xl mb-1">
              {isDropAllowed ? '⬇️' : '❌'}
            </div>
            <p className="text-xs font-medium">
              {isDropAllowed
                ? `Move to ${status}`
                : 'Cannot drop'
              }
            </p>
          </div>
        )}

        {/* Column Content - Scrollable */}
        <div className="glass-card rounded-xl border border-white/10 p-4 md:p-5 space-y-4 flex-1 overflow-y-auto backdrop-blur-md">
          {safeItems.length === 0 ? (
            <div className="text-center py-8 text-white/60">
              <div className="text-3xl mb-3">{config.icon}</div>
              <p className="text-sm font-medium text-white/80">No applications</p>
              <p className="text-xs text-white/50 mt-1">Drag here</p>
            </div>
          ) : (
            <>
              {visibleItems.map((app, index) => (
                <div key={app.id} style={{ animationDelay: `${index * 50}ms` }} className="transform transition-all duration-300 hover:scale-[1.02]">
                  <ApplicationCard 
                    application={app} 
                    onMove={onMove}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    statuses={availableStatuses}
                    onDragStart={onDragStart}
                    onDragEnd={onDragEnd}
                    viewMode="board"
                  />
                </div>
              ))}
              
              {/* Progressive Disclosure Expansion */}
              {shouldShowExpansion && !showAll && (
                <div className="p-3 text-center border-t border-white/10 bg-white/5 rounded-lg">
                  <button
                    onClick={() => setShowAll(true)}
                    className="text-sm text-indigo-300 hover:text-indigo-200 font-medium transition-colors hover:bg-indigo-500/20 px-3 py-1 rounded-lg"
                  >
                    + Show {hiddenCount} more application{hiddenCount !== 1 ? 's' : ''}
                  </button>
                </div>
              )}
              
              {/* Collapse Option */}
              {showAll && shouldShowExpansion && (
                <div className="p-3 text-center border-t border-white/10 bg-white/5 rounded-lg">
                  <button
                    onClick={() => setShowAll(false)}
                    className="text-sm text-white/60 hover:text-white/80 font-medium transition-colors hover:bg-white/10 px-3 py-1 rounded-lg"
                  >
                    ↑ Show less
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [columns, setColumns] = useState({});
  const [filteredColumns, setFilteredColumns] = useState({});
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortBy, setSortBy] = useState('recent');
  const [draggedItem, setDraggedItem] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'board'
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showPipelineSettings, setShowPipelineSettings] = useState(false);
  const [currentStages, setCurrentStages] = useState(['Applied', 'Phone Screen', 'Tech', 'On-site', 'Offer', 'Accepted', 'Rejected']);
  const [quickStatusFilter, setQuickStatusFilter] = useState(null);
  const wsRef = useRef(null);
  const toast = useToast();

  // Initialize currentStages with saved preferences and used statuses from database
  useEffect(() => {
    async function initializeStages() {
      try {
        // Get actually used statuses from the backend
        const usedStatuses = await api.getUsedStatuses();
        console.log('Used statuses from API:', usedStatuses);
        
        // Try to load saved pipeline preferences from backend
        try {
          const savedPreference = await api.getPreference('pipeline_stages');
          const savedStages = savedPreference.preference_value?.stages;
          console.log('Loaded saved pipeline stages from backend:', savedStages);
          
          // Check if we have valid saved stages
          if (savedStages && Array.isArray(savedStages) && savedStages.length > 0) {
            // Merge saved stages with any new used statuses
            const missingStatuses = usedStatuses.filter(status => !savedStages.includes(status));
            const finalStages = missingStatuses.length > 0 ? [...savedStages, ...missingStatuses] : savedStages;
            console.log('Using saved stages with missing statuses added:', finalStages);
            setCurrentStages(finalStages);
          } else {
            // No valid saved stages, use defaults with used statuses
            console.log('No valid saved pipeline stages, using defaults with used statuses');
            const mergedStages = [...new Set([...DEFAULT_STAGES, ...usedStatuses])];
            console.log('Using merged stages:', mergedStages);
            setCurrentStages(mergedStages);
          }
        } catch (err) {
          // No saved preferences, use defaults with used statuses
          console.log('No saved pipeline preferences, using defaults with used statuses');
          const mergedStages = [...new Set([...DEFAULT_STAGES, ...usedStatuses])];
          console.log('Using merged stages:', mergedStages);
          setCurrentStages(mergedStages);
        }
      } catch (err) {
        console.warn("Failed to load used statuses, using defaults:", err);
        setCurrentStages(DEFAULT_STAGES);
      }
    }
    
    initializeStages();
  }, []);

  // Save pipeline stages to backend whenever they change (but not during initialization)
  useEffect(() => {
    // Safety check: ensure currentStages is a valid array
    if (!currentStages || !Array.isArray(currentStages)) {
      return;
    }
    
    const defaultStages = ['Applied', 'Phone Screen', 'Tech', 'On-site', 'Offer', 'Accepted', 'Rejected'];
    const isDefaultStages = currentStages.length === defaultStages.length && 
                           currentStages.every((stage, index) => stage === defaultStages[index]);
    
    if (currentStages.length > 0 && !isDefaultStages) {
      const savePreferences = async () => {
        try {
          console.log('Saving pipeline stages to backend:', currentStages);
          await api.savePreference('pipeline_stages', { stages: currentStages });
          console.log('Pipeline stages saved successfully');
        } catch (err) {
          console.warn('Failed to save pipeline stages:', err);
        }
      };
      
      // Debounce the save operation to avoid too many requests
      const timeoutId = setTimeout(savePreferences, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [currentStages]);

  // Get all applications in a flat array for easier manipulation
  const allApplications = Object.values(filteredColumns).flat();
  const hasAnyApplications = Object.values(columns).flat().length > 0; // Check original data, not filtered
  const hasFilteredResults = allApplications.length > 0; // Check filtered results

  // Filter and search applications
  useEffect(() => {
    const filtered = {};
    
    currentStages.forEach(status => {
      const items = columns[status] || [];
      
      let filteredItems = items.filter(app => {
        const q = searchTerm.toLowerCase();
        const matchesSearch =
          !searchTerm ||
          app.job?.title?.toLowerCase?.().includes(q) ||
          app.job?.company_name?.toLowerCase?.().includes(q) ||
          app.job?.location?.toLowerCase?.().includes(q);
        const matchesFilter = selectedFilter === 'all' ||
          (selectedFilter === 'recent' && new Date(app.created_at) > new Date(Date.now() - 7*24*60*60*1000)) ||
          (selectedFilter === 'with-salary' && app.job.salary_min && app.job.salary_max);
        
        const matchesQuickFilter = !quickStatusFilter || app.status === quickStatusFilter;
          
        return matchesSearch && matchesFilter && matchesQuickFilter;
      });
      
      // Sort applications
      filteredItems.sort((a, b) => {
        switch (sortBy) {
          case 'recent':
            return new Date(b.created_at) - new Date(a.created_at);
          case 'salary':
            const aSalary = (a.job.salary_min + a.job.salary_max) / 2 || 0;
            const bSalary = (b.job.salary_min + b.job.salary_max) / 2 || 0;
            return bSalary - aSalary;
          case 'company':
            return (a.job.company_name || '').localeCompare(b.job.company_name || '');
          default:
            return 0;
        }
      });
      
      filtered[status] = filteredItems;
    });
    
    setFilteredColumns(filtered);
  }, [columns, searchTerm, selectedFilter, sortBy, currentStages, quickStatusFilter]);

  async function load() {
    setLoading(true);
    try {
      const result = {};
      const promises = currentStages.map(async (status) => {
        try {
          const data = await api.listCardsByStatus(status);
          // Ensure we always get an array
          result[status] = Array.isArray(data) ? data : [];
        } catch (err) {
          console.warn(`Failed to load cards for status ${status}:`, err);
          result[status] = [];
        }
      });
      await Promise.all(promises);
      setColumns(result);
      
      // Calculate enhanced stats
      const allApps = Object.values(result).flat();
      const totalApps = allApps.length;
      const activeApps = result["Applied"]?.length + result["Phone Screen"]?.length + result["Tech"]?.length + result["On-site"]?.length || 0;
      const offers = result["Offer"]?.length + result["Accepted"]?.length || 0;
      const rejections = result["Rejected"]?.length || 0;
      const successRate = totalApps > 0 ? Math.round((offers / totalApps) * 100) : 0;
      
      // Advanced analytics
      const avgSalary = allApps.reduce((sum, app) => {
        const min = app.job?.salary_min || 0;
        const max = app.job?.salary_max || 0;
        return sum + ((min + max) / 2);
      }, 0) / (allApps.filter(app => app.job?.salary_min && app.job?.salary_max).length || 1);
      
      const recentApps = allApps.filter(app => 
        new Date(app.created_at) > new Date(Date.now() - 7*24*60*60*1000)
      ).length;
      
      const conversionRate = result["Applied"]?.length > 0 ? 
        Math.round((activeApps / result["Applied"].length) * 100) : 0;
      
      const topCompanies = allApps.reduce((acc, app) => {
        const company = app.job?.company_name;
        if (company) {
          acc[company] = (acc[company] || 0) + 1;
        }
        return acc;
      }, {});
      
      setStats({ 
        totalApps, 
        activeApps, 
        offers, 
        rejections,
        successRate, 
        avgSalary: Math.round(avgSalary),
        recentApps,
        conversionRate,
        topCompanies: Object.entries(topCompanies)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
      });
    } catch (err) {
      toast.error("Failed to load pipeline data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // live updates
    wsRef.current = connectWS((evt) => {
      if (["stage_changed", "stage_added"].includes(evt.type)) {
        load();
        toast.success("Pipeline updated!");
      }
    });
    return () => wsRef.current && wsRef.current.close();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        // focus the top search input
        const el = document.querySelector('input[placeholder="Search applications..."]');
        el?.focus();
      }
      if (e.altKey && e.key >= '1' && e.key <= '9') {
        const idx = parseInt(e.key,10)-1;
        const headings = document.querySelectorAll('[data-stage-anchor]');
        headings[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleDragStart = (application) => {
    setDraggedItem(application);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  async function move(id, status) {
    try {
      await api.moveApp(id, status);
      await load();
      toast.success(`Application moved to ${status}`);
      
      // Trigger confetti for success states
      if (['Offer','Accepted'].includes(status) && confettiFn) {
        confettiFn({ particleCount: 120, spread: 70, origin: { y: 0.25 } });
      }
    } catch (err) {
      console.error("Move error:", err);
      if (err.message === "Auth expired") {
        toast.error("Session expired, please refresh the page");
      } else {
        toast.error("Failed to move application");
      }
    }
  }

  async function deleteApplication(id) {
    console.log('=== DELETE DEBUG ===');
    console.log('Attempting to delete application with ID:', id);
    
    try {
      console.log('Calling api.deleteApp...');
      const result = await api.deleteApp(id);
      console.log('API delete result:', result);
      
      console.log('Reloading applications...');
      await load();
      console.log('Reload complete');
      
      toast.success("Application deleted successfully");
    } catch (err) {
      console.error('Delete error:', err);
      toast.error("Failed to delete application");
    }
    console.log('=== DELETE END ===');
  }

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedFilter('all');
    setSortBy('recent');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)'}}>
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-400 mx-auto"></div>
          <p className="text-gray-300 text-lg">Loading your pipeline...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div>
              <h1 className="text-3xl font-bold text-slate-200">Application Pipeline</h1>
              <p className="text-slate-400 mt-1">Track your journey to success</p>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* View Toggle */}
              <div className="flex bg-white/10 border border-white/20 rounded-lg p-1 backdrop-blur-sm">
                <button
                  onClick={() => setViewMode('cards')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    viewMode === 'cards' 
                      ? 'bg-indigo-500 text-white shadow-sm' 
                      : 'text-gray-300 hover:text-white border border-gray-300 hover:border-white'
                  }`}
                >
                  <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Cards
                </button>
                <button
                  onClick={() => setViewMode('board')}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                    viewMode === 'board' 
                      ? 'bg-indigo-500 text-white shadow-sm' 
                      : 'text-gray-300 hover:text-white border border-gray-300 hover:border-white'
                  }`}
                >
                  <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Board
                </button>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowAnalytics(!showAnalytics)}
                className="text-purple-400 border-purple-400 hover:bg-purple-500/20"
              >
                <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </Button>
              
              <Link href="/jobs">
                <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg">
                  <svg className="w-4 h-4 mr-1 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add Job
                </Button>
              </Link>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Application Overview Header */}
            <h2 className="text-2xl font-bold text-gray-300 mb-6">Application Overview</h2>

        {/* Quick Stats - Always Visible */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card rounded-2xl p-8 border border-white/20 hover:border-blue-400/50 transition-all duration-300 group">
            <div className="text-center">
              <div className="inline-flex p-4 bg-gradient-to-br from-blue-500/30 to-blue-600/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-blue-300 mb-2">Total Applications</p>
              <p className="text-4xl font-bold text-white group-hover:text-blue-300 transition-colors">{stats.totalApps || 0}</p>
            </div>
          </div>
          
          <div className="glass-card rounded-2xl p-8 border border-white/20 hover:border-yellow-400/50 transition-all duration-300 group">
            <div className="text-center">
              <div className="inline-flex p-4 bg-gradient-to-br from-yellow-500/30 to-orange-600/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-yellow-300 mb-2">In Progress</p>
              <p className="text-4xl font-bold text-white group-hover:text-yellow-300 transition-colors">{stats.activeApps || 0}</p>
            </div>
          </div>
          
          <div className="glass-card rounded-2xl p-8 border border-white/20 hover:border-green-400/50 transition-all duration-300 group">
            <div className="text-center">
              <div className="inline-flex p-4 bg-gradient-to-br from-green-500/30 to-emerald-600/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-green-300 mb-2">Offers</p>
              <p className="text-4xl font-bold text-white group-hover:text-green-300 transition-colors">{stats.offers || 0}</p>
            </div>
          </div>
          
          <div className="glass-card rounded-2xl p-8 border border-white/20 hover:border-purple-400/50 transition-all duration-300 group">
            <div className="text-center">
              <div className="inline-flex p-4 bg-gradient-to-br from-purple-500/30 to-pink-600/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-8 h-8 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-lg font-semibold text-purple-300 mb-2">Success Rate</p>
              <p className="text-4xl font-bold text-white group-hover:text-purple-300 transition-colors">{stats.successRate || 0}%</p>
            </div>
          </div>
        </div>

        {/* Pipeline Settings */}
        <div className="glass-card rounded-2xl p-6 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Pipeline Settings</h3>
            <Button
              variant="outline"
              onClick={() => setShowPipelineSettings(!showPipelineSettings)}
              className="text-sm"
            >
              {showPipelineSettings ? 'Hide Settings' : 'Customize Pipeline'}
            </Button>
          </div>
          
          {showPipelineSettings && (
            <PipelineCustomizer 
              stages={currentStages}
              onStagesChange={setCurrentStages}
              availableStages={Object.keys(statusConfig)}
              onClose={() => setShowPipelineSettings(false)}
            />
          )}
        </div>

        {/* Enhanced Analytics Panel */}
        {showAnalytics && (
          <Card className="glass-card glass-cyan">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-2xl">📊</span>
              <h3 className="text-xl font-semibold text-slate-100">Detailed Analytics</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-slate-100 mb-3 relative">
                  Performance Metrics
                  <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-400 to-emerald-400 opacity-60"></div>
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Conversion Rate:</span>
                    <span className="font-medium text-emerald-400 drop-shadow-lg">{stats.conversionRate || 0}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Average Salary:</span>
                    <span className="font-medium text-cyan-400 drop-shadow-lg">
                      {stats.avgSalary > 0 ? `$${stats.avgSalary?.toLocaleString()}` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Recent Activity:</span>
                    <span className="font-medium text-purple-400 drop-shadow-lg">{stats.recentApps || 0} this week</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-100 mb-3 relative">
                  Top Companies
                  <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 opacity-60"></div>
                </h4>
                <div className="space-y-1 text-sm">
                  {stats.topCompanies?.slice(0, 4).map(([company, count]) => (
                    <div key={company} className="flex justify-between">
                      <span className="truncate text-slate-300">{company}</span>
                      <span className="font-medium text-indigo-400 drop-shadow-lg">{count}</span>
                    </div>
                  ))}
                  {(!stats.topCompanies || stats.topCompanies.length === 0) && (
                    <p className="text-slate-500 italic">No companies yet</p>
                  )}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-100 mb-3 flex items-center relative">
                  <svg className="w-4 h-4 mr-1 text-yellow-400 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Insights
                  <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-yellow-400 to-orange-400 opacity-60"></div>
                </h4>
                <div className="space-y-2 text-sm text-slate-300">
                  {stats.recentApps === 0 && (
                    <p className="text-cyan-300 drop-shadow-sm">• Consider applying to more positions this week</p>
                  )}
                  {stats.successRate < 10 && stats.totalApps > 5 && (
                    <p className="text-orange-300 drop-shadow-sm">• Review your application strategy</p>
                  )}
                  {stats.activeApps === 0 && stats.totalApps > 0 && (
                    <p className="text-emerald-300 drop-shadow-sm">• Follow up on pending applications</p>
                  )}
                  {stats.avgSalary === 0 && (
                    <p className="text-purple-300 drop-shadow-sm">• Add salary information to track compensation</p>
                  )}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Enhanced Search and Filter Header */}
        {hasAnyApplications && (
          <>
            <Card className="glass-card glass-amber">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <span className="text-2xl">🔍</span>
                <h2 className="text-xl font-semibold text-slate-100">Search & Filter Applications</h2>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-sm">🔍</span>
                </div>
                <input
                  placeholder="Search applications by job title, company, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full input-glass input-amber pl-10"
                />
              </div>
              
              {/* Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="input-glass input-amber"
                >
                  <option value="all">All Applications</option>
                  <option value="recent">Recent (7 days)</option>
                  <option value="with-salary">With Salary Info</option>
                </Select>

                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="input-glass input-amber"
                >
                  <option value="recent">Sort by Date</option>
                  <option value="salary">Sort by Salary</option>
                  <option value="company">Sort by Company</option>
                </Select>

                <div className="flex items-center justify-end">
                  <Button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedFilter('all');
                      setSortBy('recent');
                    }}
                    variant="outline"
                    size="sm"
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          </Card>
          </>
        )}

        {/* Main Content */}
        {!hasAnyApplications ? (
          // Empty State - No applications at all
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full animate-pulse opacity-75"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-emerald-400 rounded-full animate-ping opacity-20"></div>
                <svg className="w-12 h-12 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 drop-shadow-lg">Start Your Job Hunt!</h3>
              <p className="text-gray-300 mb-8 drop-shadow-sm">
                Add your first job application to begin tracking your progress through our beautiful pipeline.
              </p>
              <div className="space-y-3">
                <Link href="/jobs">
                  <Button className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg px-8 py-3 hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <svg className="w-4 h-4 mr-2 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Your First Job
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : !hasFilteredResults ? (
          // No Search Results - Applications exist but search/filter doesn't match
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full animate-pulse opacity-75"></div>
                <svg className="w-12 h-12 text-white relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 drop-shadow-lg">No Results Found</h3>
              <p className="text-gray-300 mb-8 drop-shadow-sm">
                No applications match your current search or filter criteria. Try adjusting your search terms or clear the filters.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedFilter('all');
                    setSortBy('recent');
                  }}
                  variant="outline" 
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  Clear Search & Filters
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Your Applications Header */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-300">Your Applications</h2>
              <p className="text-sm text-gray-400 mt-1">Manage and track your job applications in {viewMode} view</p>
            </div>

            {viewMode === 'cards' ? (
              // Cards View - Modern, Clean Layout with Stage Numbers
              <div className="space-y-6 mb-4 md:mb-6 border-b border-gray-200 dark:border-gray-800 pb-6">
            {currentStages.map((status, index) => {
              const items = filteredColumns[status] || [];
              if (items.length === 0) return null;
              
              return (
                <div key={status} className="glass-card rounded-2xl border border-white/20 overflow-hidden">
                  <div className="bg-gradient-to-r from-white/10 to-white/5 p-4 border-b border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-md ${
                          statusConfig[status]?.bgColor || 'bg-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="p-2 bg-white/10 rounded-lg shadow-sm">
                          <span className="text-xl">{statusConfig[status]?.icon || '📋'}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-white drop-shadow-lg">{status}</h3>
                          <p className="text-sm text-white/70">{items.length} application{items.length !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {items.filter(app => app.priority === 'high').length > 0 && (
                          <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded-full text-xs font-medium border border-red-400/30">
                            🔥 {items.filter(app => app.priority === 'high').length} high priority
                          </span>
                        )}
                        {items.some(app => app.job?.salary_min && app.job?.salary_max) && (
                          <span className="bg-green-500/20 text-green-300 px-2 py-1 rounded-full text-xs font-medium border border-green-400/30">
                            💰 Avg $
                            {Math.round(
                              items.reduce((sum, app) => {
                                const min = app.job?.salary_min || 0;
                                const max = app.job?.salary_max || 0;
                                return sum + ((min + max) / 2);
                              }, 0) / (items.filter(app => app.job?.salary_min && app.job?.salary_max).length || 1) / 1000
                            )}k
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {items.map((app, index) => (
                        <div key={app.id} style={{ animationDelay: `${index * 100}ms` }}>
                          <ApplicationCard 
                            application={app} 
                            onMove={move}
                            onDelete={deleteApplication}
                            onUpdate={load}
                            statuses={currentStages}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            viewMode="cards"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
            ) : (
              // Board View - Direct Pipeline Columns
              <div className="glass-card rounded-2xl border border-white/20 p-4 lg:p-6 mb-4 md:mb-6 border-b border-gray-200 dark:border-gray-800 pb-6">
            {/* Pipeline Columns Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
              {currentStages.map((status, index) => {
                const items = filteredColumns[status] || [];
                return (
                  <div key={status} className="min-h-[500px] w-full relative">
                    <Column 
                      status={status} 
                      items={items} 
                      onMove={move}
                      onDelete={deleteApplication}
                      onUpdate={load}
                      availableStatuses={currentStages}
                      draggedItem={draggedItem}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      stageNumber={index + 1}
                    />
                    
                    {/* Flow Arrow (for larger screens) */}
                    {index < currentStages.length - 1 && (
                      <div className="hidden xl:block absolute -right-3 top-1/2 transform -translate-y-1/2 z-10">
                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full p-1.5 shadow-lg">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
              </div>
            )}
          </>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Job Detail Modal Component
function JobDetailModal({ application, onClose }) {
  const [stages, setStages] = useState([]);
  const [loadingStages, setLoadingStages] = useState(false);

  // Debug logging
  console.log('JobDetailModal application data:', application);

  // Load stages when modal opens
  useEffect(() => {
    if (application?.id) {
      loadStages();
    }
  }, [application?.id]);

  const loadStages = async () => {
    if (!application?.id) return;
    
    setLoadingStages(true);
    try {
      const stagesData = await api.getStages(application.id);
      setStages(Array.isArray(stagesData) ? stagesData : []);
    } catch (err) {
      console.warn('Failed to load stages:', err);
      setStages([]);
    } finally {
      setLoadingStages(false);
    }
  };

  if (!application) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] p-4">
      <div className="modal-backdrop" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="modal-glass rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-xl font-semibold text-white drop-shadow-lg">Application Details</h2>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6">
          {/* Job Header */}
          <div className="border-b border-white/10 pb-4">
            <h3 className="text-2xl font-bold text-white mb-2 drop-shadow-lg">
              {application.job?.title || 'Unknown Position'}
            </h3>
            <p className="text-xl text-cyan-300 font-medium drop-shadow-sm">
              {application.job?.company?.name || application.job?.company_name || 'Unknown Company'}
            </p>
          </div>

          {/* Status and Application Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="field-label">Current Status</h4>
              <div className="field-value flex items-center">
                <span className="mr-2">{statusConfig[application.status]?.icon}</span>
                <span className="font-medium">{application.status}</span>
              </div>
            </div>
            <div>
              <h4 className="field-label">Applied On</h4>
              <p className="field-value">
                {(() => {
                  // Try different field names that might contain the date
                  const possibleDateFields = [
                    application.created_at,
                    application.applied_at,
                    application.date_applied,
                    application.application_date
                  ];
                  
                  const dateValue = possibleDateFields.find(field => field != null);
                  
                  if (!dateValue) return 'Date not available';
                  try {
                    const date = new Date(dateValue);
                    if (isNaN(date.getTime())) return 'Invalid date format';
                    return date.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long', 
                      day: 'numeric'
                    });
                  } catch (e) {
                    return 'Date parsing error';
                  }
                })()}
              </p>
            </div>
            <div>
              <h4 className="field-label">Days Since Applied</h4>
              <p className="field-value">
                {(() => {
                  // Try different field names that might contain the date
                  const possibleDateFields = [
                    application.created_at,
                    application.applied_at,
                    application.date_applied,
                    application.application_date
                  ];
                  
                  const dateValue = possibleDateFields.find(field => field != null);
                  
                  if (!dateValue) return 'N/A';
                  try {
                    const createdDate = new Date(dateValue);
                    if (isNaN(createdDate.getTime())) return 'N/A';
                    const daysDiff = Math.ceil((new Date() - createdDate) / (1000 * 60 * 60 * 24));
                    return daysDiff + ' days';
                  } catch (e) {
                    return 'N/A';
                  }
                })()}
              </p>
            </div>
          </div>

          {/* Status History */}
          <div>
            <h4 className="field-label mb-3">Status History</h4>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10">
              {loadingStages ? (
                <div className="text-center text-white/70">
                  <p>Loading status history...</p>
                </div>
              ) : stages && stages.length > 0 ? (
                <div className="space-y-2">
                  {stages.map((stage, index) => (
                    <div key={stage.id || index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <span className="mr-2">{statusConfig[stage.name]?.icon || '📋'}</span>
                        <span className="text-white">{stage.name}</span>
                        {stage.notes && (
                          <span className="ml-2 text-xs text-white/60">- {stage.notes}</span>
                        )}
                      </div>
                      <span className="text-white/60">
                        {stage.created_at ? new Date(stage.created_at).toLocaleDateString() : 'Unknown date'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-white/70">
                  <p>No status changes recorded yet</p>
                  <p className="text-xs mt-1">Status changes will appear here as you move applications</p>
                </div>
              )}
            </div>
          </div>

          {/* Job Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Location */}
            {application.job?.location && (
              <div>
                <h4 className="field-label">📍 Location</h4>
                <p className="field-value">{application.job.location}</p>
              </div>
            )}

            {/* Work Type */}
            {application.job?.remote_type && (
              <div>
                <h4 className="field-label">💼 Work Type</h4>
                <p className="field-value">{application.job.remote_type}</p>
              </div>
            )}

            {/* Job Type */}
            {application.job?.job_type && (
              <div>
                <h4 className="field-label">⏰ Job Type</h4>
                <p className="field-value">{application.job.job_type}</p>
              </div>
            )}

            {/* Salary Range */}
            {(application.job?.salary_min || application.job?.salary_max) && (
              <div>
                <h4 className="field-label">💰 Salary Range</h4>
                <p className="field-value text-green-300">
                  ${application.job.salary_min?.toLocaleString() || 'N/A'} - ${application.job.salary_max?.toLocaleString() || 'N/A'}
                </p>
              </div>
            )}
          </div>

          {/* Priority */}
          {application.priority && application.priority !== 'normal' && (
            <div>
              <h4 className="field-label">Priority</h4>
              <div className="field-value flex items-center">
                <span className="mr-2">
                  {application.priority === 'high' ? '🔥' : application.priority === 'medium' ? '⭐' : '📌'}
                </span>
                <span className={`capitalize font-medium ${
                  application.priority === 'high' ? 'text-red-300' : 
                  application.priority === 'medium' ? 'text-yellow-300' : 'text-white/70'
                }`}>
                  {application.priority} priority
                </span>
              </div>
            </div>
          )}

          {/* Source URL */}
          {application.job?.source_url && (
            <div>
              <h4 className="field-label">🔗 Source URL</h4>
              <a
                href={application.job.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="field-value text-cyan-300 hover:text-cyan-200 underline break-all"
              >
                {application.job.source_url}
              </a>
            </div>
          )}

          {/* Description */}
          {application.job?.description && (
            <div>
              <h4 className="field-label">📝 Job Description</h4>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10 max-h-40 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm text-white/90 font-sans">
                  {application.job.description}
                </pre>
              </div>
            </div>
          )}

          {/* Requirements */}
          {application.job?.requirements && application.job.requirements.length > 0 && (
            <div>
              <h4 className="field-label">✅ Requirements</h4>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                <ul className="list-disc list-inside space-y-1">
                  {application.job.requirements.map((req, index) => (
                    <li key={index} className="text-sm text-white/90">{req}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Skills */}
          {application.job?.skills && application.job.skills.length > 0 && (
            <div>
              <h4 className="field-label">🛠️ Required Skills</h4>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                <div className="flex flex-wrap gap-2">
                  {application.job.skills.map((skill, index) => (
                    <span key={index} className="bg-cyan-500/20 text-cyan-200 px-2 py-1 rounded-full text-sm border border-cyan-400/30">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Benefits */}
          {application.job?.benefits && application.job.benefits.length > 0 && (
            <div>
              <h4 className="field-label">🎁 Benefits & Perks</h4>
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-lg border border-white/10">
                <ul className="list-disc list-inside space-y-1">
                  {application.job.benefits.map((benefit, index) => (
                    <li key={index} className="text-sm text-white/90">{benefit}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Application Metadata */}
          <div className="border-t border-white/10 pt-4">
            <div className="text-sm text-white/60 space-y-1">
              <p>Application ID: {application.id}</p>
              <p>Created: {new Date(application.created_at).toLocaleString()}</p>
              {application.updated_at && (
                <p>Last Updated: {new Date(application.updated_at).toLocaleString()}</p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-white/10 bg-white/5">
          <Button variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
            Close
          </Button>
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Note Modal Component
function NoteModal({ application, onClose }) {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [editText, setEditText] = useState('');

  // Load notes for this application (without demo notes)
  useEffect(() => {
    loadNotes();
  }, [application.id]);

  const loadNotes = async () => {
    setLoading(true);
    console.log('=== LOADING NOTES ===');
    console.log('Application ID:', application.id);
    
    try {
      const notesData = await api.getNotes(application.id);
      console.log('Notes loaded from API:', notesData);
      setNotes(notesData || []);
    } catch (error) {
      console.error('Failed to load notes:', error);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    setLoading(true);
    console.log('=== ADDING NOTE ===');
    console.log('Application ID:', application.id);
    console.log('Note content:', newNote.trim());
    
    try {
      const savedNote = await api.addNote(application.id, newNote.trim());
      console.log('Note saved to API:', savedNote);
      setNotes(prev => [savedNote, ...prev]);
      setNewNote('');
    } catch (error) {
      console.error('Failed to add note:', error);
      // Show error message to user
      alert('Failed to save note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditNote = async (noteId, newContent) => {
    if (!newContent.trim()) return;

    try {
      // For now, just update locally since there's no backend edit endpoint
      // TODO: Implement backend note update endpoint
      setNotes(prev => prev.map(note => 
        note.id === noteId 
          ? { ...note, body: newContent.trim(), updated_at: new Date().toISOString() }
          : note
      ));
      setEditingNote(null);
      setEditText('');
      
      // Show a warning that changes are local only
      console.warn('Note edited locally only - backend update endpoint not implemented');
    } catch (error) {
      console.error('Failed to edit note:', error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) return;

    try {
      // In real implementation, call API to delete note
      setNotes(prev => prev.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  const startEditing = (note) => {
    setEditingNote(note.id);
    setEditText(note.body || note.content);
  };

  const cancelEditing = () => {
    setEditingNote(null);
    setEditText('');
  };

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[9999] p-4">
      <div className="modal-backdrop" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="modal-glass rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 flex-shrink-0">
            <h2 className="text-xl font-semibold text-white drop-shadow-lg">Notes</h2>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

        {/* Job Info */}
        <div className="px-6 py-3 bg-white/5 border-b border-white/10 flex-shrink-0">
          <h3 className="font-medium text-white text-sm">
            {application.job?.title || 'Unknown Position'}
          </h3>
          <p className="text-xs text-white/60">
            {application.job?.company?.name || application.job?.company_name || 'Unknown Company'}
          </p>
        </div>

        {/* Add New Note */}
        <div className="p-4 border-b border-white/10 flex-shrink-0">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="input-glass w-full p-3 resize-none"
            rows={3}
          />
          <div className="flex justify-end mt-2">
            <Button
              size="sm"
              onClick={handleAddNote}
              disabled={!newNote.trim() || loading}
            >
              {loading ? 'Adding...' : 'Add Note'}
            </Button>
          </div>
        </div>

        {/* Notes List */}
        <div className="flex-1 overflow-y-auto p-4">
          {notes.length === 0 ? (
            <div className="text-center text-white/70 py-8">
              <span className="text-2xl mb-2 block">📝</span>
              <p>No notes yet</p>
              <p className="text-sm">Add your first note above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div key={note.id} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/10">
                  {editingNote === note.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="input-glass w-full p-2 resize-none"
                        rows={3}
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={cancelEditing}
                          className="text-sm text-white/70 hover:text-white"
                        >
                          Cancel
                        </button>
                        <Button
                          size="sm"
                          onClick={() => handleEditNote(note.id, editText)}
                          disabled={!editText.trim()}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex justify-between items-start mb-2">
                        <p className="text-white text-sm flex-1 pr-2">{note.body || note.content}</p>
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => startEditing(note)}
                            className="text-white/60 hover:text-cyan-300 p-1"
                            title="Edit note"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="text-white/60 hover:text-red-300 p-1"
                            title="Delete note"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-xs text-white/60">
                        <span>
                          {new Date(note.created_at).toLocaleDateString()} at{' '}
                          {new Date(note.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {note.updated_at && note.updated_at !== note.created_at && (
                          <span className="text-white/50">
                            Edited {new Date(note.updated_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end p-4 border-t border-white/10 bg-white/5 flex-shrink-0">
          <Button variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
            Close
          </Button>
        </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// Pipeline Customizer Component
function PipelineCustomizer({ stages, onStagesChange, availableStages, onClose }) {
  const [tempStages, setTempStages] = useState([...stages]);
  const [draggedStage, setDraggedStage] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const addStage = (stageName) => {
    if (!tempStages.includes(stageName)) {
      setTempStages([...tempStages, stageName]);
    }
  };

  const removeStage = (stageName) => {
    setTempStages(tempStages.filter(s => s !== stageName));
  };

  const handleDragStart = (e, stage, index) => {
    setDraggedStage({ stage, index });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    setDragOverIndex(null);
    
    if (draggedStage && draggedStage.index !== dropIndex) {
      const newStages = [...tempStages];
      const [removed] = newStages.splice(draggedStage.index, 1);
      newStages.splice(dropIndex, 0, removed);
      setTempStages(newStages);
    }
    
    setDraggedStage(null);
  };

  const saveChanges = () => {
    console.log('PipelineCustomizer: Saving stages to parent:', tempStages);
    onStagesChange(tempStages);
    if (onClose) onClose(); // Auto-close settings panel
  };

  const resetToDefaults = () => {
    setTempStages(['Applied', 'Phone Screen', 'Tech', 'On-site', 'Offer', 'Accepted', 'Rejected']);
  };

  const cancel = () => {
    setTempStages([...stages]);
    if (onClose) onClose(); // Auto-close settings panel
  };

  return (
    <div className="space-y-8">
      {/* Current Pipeline Order */}
      <div>
        <h4 className="text-xl font-bold text-white mb-2">Current Pipeline Order</h4>
        <p className="text-indigo-300 mb-6">Drag and drop to reorder stages</p>
        <div className="space-y-3 mb-6">
          {tempStages.map((stage, index) => (
            <div 
              key={stage} 
              draggable
              onDragStart={(e) => handleDragStart(e, stage, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              className={`flex items-center glass-card border rounded-xl p-4 cursor-move hover:shadow-lg transition-all group ${
                dragOverIndex === index ? 'border-indigo-400/60 bg-indigo-500/20 shadow-lg shadow-indigo-500/20' : 'border-white/20 hover:border-indigo-400/30'
              } ${draggedStage?.index === index ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center text-indigo-400 mr-4">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </div>
              <span className="text-lg font-bold text-indigo-300 mr-4 min-w-[2rem]">{index + 1}.</span>
              <span className="text-lg mr-3">{statusConfig[stage]?.icon}</span>
              <span className="text-lg font-medium flex-1 text-white group-hover:text-indigo-300 transition-colors">{stage}</span>
              <button
                onClick={() => removeStage(stage)}
                className="ml-4 text-red-400 hover:text-red-300 p-2 hover:bg-red-500/20 rounded-xl transition-all hover:scale-110"
                title="Remove stage"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Available Stages to Add */}
      <div>
        <h4 className="text-xl font-bold text-white mb-2">Available Stages</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {availableStages
            .filter(stage => !tempStages.includes(stage))
            .map(stage => (
              <button
                key={stage}
                onClick={() => addStage(stage)}
                className="flex items-center justify-center bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-200 rounded-xl p-4 hover:from-indigo-500/30 hover:to-purple-500/30 transition-all text-sm border border-indigo-400/30 hover:border-indigo-300/50 hover:scale-105 group"
              >
                <span className="mr-2 text-lg">{statusConfig[stage]?.icon}</span>
                <span className="truncate font-medium group-hover:text-white transition-colors">{stage}</span>
                <svg className="w-4 h-4 ml-2 flex-shrink-0 text-indigo-400 group-hover:text-indigo-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
            ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6 border-t border-indigo-400/20">
        <Button 
          variant="outline" 
          onClick={resetToDefaults} 
          className="border-amber-400/50 text-amber-300 hover:bg-amber-500/20 hover:border-amber-400 transition-all hover:scale-105"
        >
          <span className="mr-2">🔄</span>
          Reset to Defaults
        </Button>
        <div className="flex gap-4">
          <Button 
            variant="outline" 
            onClick={cancel} 
            className="border-gray-400/50 text-gray-300 hover:bg-gray-500/20 hover:border-gray-400 transition-all hover:scale-105 min-w-[120px]"
          >
            <span className="mr-2">❌</span>
            Cancel
          </Button>
          <Button 
            onClick={saveChanges} 
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl hover:shadow-purple-500/25 transition-all hover:scale-105 min-w-[140px]"
          >
            <span className="mr-2">💾</span>
            Save Pipeline
          </Button>
        </div>
      </div>
    </div>
  );
}
