import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AskSahayak from './pages/AskSahayak';
import WorksheetBuilder from './pages/WorksheetBuilder';
import DiagramGenerator from './pages/DiagramGenerator';
import PreparationCoach from './pages/PreparationCoach';
import ReflectionCoach from './pages/ReflectionCoach';
import LessonPlanner from './pages/LessonPlanner';
import AutoEval from './pages/AutoEval';
import ResourceBazaar from './pages/ResourceBazaar';
import MindMap from './pages/MindMap';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<AskSahayak />} />
      <Route path="/ask-sahayak" element={<AskSahayak />} />
      <Route path="/worksheet-builder" element={<WorksheetBuilder />} />
      <Route path="/diagram-generator" element={<DiagramGenerator />} />
      <Route path="/preparation-coach" element={<PreparationCoach />} />
      <Route path="/reflection-coach" element={<ReflectionCoach />} />
      <Route path="/lesson-planner" element={<LessonPlanner />} />
      <Route path="/auto-eval" element={<AutoEval />} />
      <Route path="/resource-bazaar" element={<ResourceBazaar />} />
      <Route path="/mind-map" element={<MindMap />} />
      {/* Add more routes as needed */}
    </Routes>
  );
}
