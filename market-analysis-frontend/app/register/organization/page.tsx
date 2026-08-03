'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  Globe,
  Target,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Plus,
  Info,
  Flag,
  Trash2,
  RocketIcon as Rocket,
  User,
  TrendingUp,
} from 'lucide-react';

type StepType = 'profile' | 'market' | 'goals';

interface OrganizationData {
  companyName: string;
  industry: string;
  companySize: string;
  website: string;
  description: string;
  location: string;
  products: string[];
  targetCustomers: string;
  competitors: string[];
  challenges: string;
  offerings: string;
  businessGoals: string;
}

const defaultCompetitors = [
  'Turing',
  'Fractal Analytics',
  'DataRobot',
  'Persistent Systems',
];

export default function OrganizationRegisterPage() {
  const [currentStep, setCurrentStep] = useState<StepType>('profile');
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newProduct, setNewProduct] = useState('');
  const [newCompetitor, setNewCompetitor] = useState('');

  const [formData, setFormData] = useState<OrganizationData>({
    companyName: '',
    industry: '',
    companySize: '',
    website: '',
    description: '',
    location: '',
    products: [],
    targetCustomers: '',
    competitors: [],
    challenges: '',
    offerings: '',
    businessGoals: '',
  });

  const steps = [
    { id: 'profile' as StepType, label: 'Profile', icon: User },
    { id: 'market' as StepType, label: 'Market', icon: TrendingUp },
    { id: 'goals' as StepType, label: 'Goals', icon: Flag },
  ];

  const updateFormData = (field: keyof OrganizationData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addProduct = () => {
    if (newProduct.trim()) {
      updateFormData('products', [...formData.products, newProduct.trim()]);
      setNewProduct('');
    }
  };

  const removeProduct = (index: number) => {
    updateFormData(
      'products',
      formData.products.filter((_, i) => i !== index)
    );
  };

  const toggleCompetitor = (competitor: string) => {
    const isSelected = formData.competitors.includes(competitor);
    if (isSelected) {
      updateFormData(
        'competitors',
        formData.competitors.filter((c) => c !== competitor)
      );
    } else {
      updateFormData('competitors', [...formData.competitors, competitor]);
    }
  };

  const addCustomCompetitor = () => {
    if (newCompetitor.trim() && !formData.competitors.includes(newCompetitor.trim())) {
      updateFormData('competitors', [...formData.competitors, newCompetitor.trim()]);
      setNewCompetitor('');
    }
  };

  const removeCompetitor = (competitor: string) => {
    updateFormData(
      'competitors',
      formData.competitors.filter((c) => c !== competitor)
    );
  };

  const handleNext = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentStep === 'profile') setCurrentStep('market');
    else if (currentStep === 'market') setCurrentStep('goals');
  };

  const handleBack = (e?: React.MouseEvent<HTMLButtonElement>) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (currentStep === 'goals') setCurrentStep('market');
    else if (currentStep === 'market') setCurrentStep('profile');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Only submit if we're on the goals step
    if (currentStep !== 'goals') {
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      console.log('Organization Registration:', formData);
      setIsSubmitting(false);
      setShowSuccess(true);
      setTimeout(() => {
        console.log('Redirecting to dashboard...');
      }, 2500);
    }, 1500);
  };

  const getCurrentStepIndex = () => {
    return steps.findIndex((step) => step.id === currentStep);
  };

  const progressPercentage = ((getCurrentStepIndex() + 1) / steps.length) * 100;

  return (
    <>
      <div
        className="min-h-screen flex flex-col relative overflow-hidden"
        style={{ backgroundColor: '#f8f9ff' }}
      >
        {/* Background Decoration */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <div
            className="absolute rounded-full"
            style={{
              top: '-10%',
              right: '-5%',
              width: '40%',
              height: '40%',
              backgroundColor: 'rgba(163, 240, 239, 0.2)',
              filter: 'blur(120px)',
            }}
          ></div>
          <div
            className="absolute rounded-full"
            style={{
              bottom: '-10%',
              left: '-5%',
              width: '30%',
              height: '30%',
              backgroundColor: 'rgba(163, 237, 236, 0.2)',
              filter: 'blur(100px)',
            }}
          ></div>
        </div>

        {/* Top Navigation Bar */}
        <nav className="w-full px-8 md:px-16 py-6 flex items-center justify-center relative z-10">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: '#1a7070' }}
            >
              <span
                className="material-symbols-outlined text-2xl"
                style={{
                  fontVariationSettings: "'FILL' 1",
                  color: '#ffffff',
                }}
              >
                smart_toy
              </span>
            </div>
            <span
              className="text-2xl font-bold tracking-tight"
              style={{
                fontFamily: 'Hanken Grotesk, sans-serif',
                color: '#005657',
              }}
            >
              PersonaFlow
            </span>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-4 py-8 relative z-10">
          <div className="w-full max-w-[720px]">
            {/* Header & Progress */}
            <div className="text-center mb-8">
              <h1
                className="mb-2"
                style={{
                  fontFamily: 'Hanken Grotesk, sans-serif',
                  fontSize: '32px',
                  lineHeight: '40px',
                  fontWeight: '600',
                  letterSpacing: '-0.01em',
                  color: '#005657',
                }}
              >
                Register Organization
              </h1>
              <p
                style={{
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '16px',
                  lineHeight: '24px',
                  color: '#3f4948',
                }}
              >
                Configure your enterprise footprint within PersonaFlow
              </p>
            </div>

            {/* Progress Stepper */}
            <div className="mb-8">
              <div className="flex items-center justify-center gap-8 md:gap-24 relative">
                {/* Progress Line */}
                <div
                  className="absolute top-5 left-[20%] right-[20%] h-0.5 -z-10"
                  style={{ backgroundColor: '#bec9c8' }}
                >
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      backgroundColor: '#1a7070',
                      width: `${progressPercentage}%`,
                    }}
                  ></div>
                </div>

                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = step.id === currentStep;
                  const isCompleted = getCurrentStepIndex() > index;

                  return (
                    <div key={step.id} className="flex flex-col items-center gap-2">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                          isActive ? 'scale-110 shadow-lg' : isCompleted ? 'shadow-md' : ''
                        }`}
                        style={{
                          backgroundColor:
                            isActive || isCompleted ? '#1a7070' : '#e5eeff',
                          color: isActive || isCompleted ? '#ffffff' : '#6f7979',
                          ...(isActive && {
                            boxShadow: '0 0 0 4px rgba(26, 112, 112, 0.1)',
                          }),
                        }}
                      >
                        {isCompleted ? (
                          <Check size={18} />
                        ) : (
                          <StepIcon size={20} />
                        )}
                      </div>
                      <span
                        className="text-sm font-medium"
                        style={{
                          fontFamily: 'Geist, sans-serif',
                          color: isActive || isCompleted ? '#005657' : '#6f7979',
                          fontWeight: isActive ? '600' : '500',
                        }}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Form Card */}
            <div
              className="bg-white rounded-xl p-8 md:p-10 shadow-sm relative overflow-hidden"
              style={{ border: '1px solid #bec9c8' }}
            >
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Step 1: Profile */}
                {currentStep === 'profile' && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Organization Name */}
                    <div className="space-y-2">
                      <label
                        htmlFor="companyName"
                        style={{
                          fontFamily: 'Geist, sans-serif',
                          fontSize: '12px',
                          lineHeight: '14px',
                          fontWeight: '500',
                          color: '#6f7979',
                        }}
                      >
                        Organization Name
                      </label>
                      <input
                        className="w-full py-3 px-4 text-[#005657] font-bold border border-[#bec9c8] rounded-lg outline-none transition-all"
                        // style={{
                        //   border: '1px solid #bec9c8',
                        //   fontFamily: 'Hanken Grotesk, sans-serif',
                        //   fontSize: '24px',
                        //   lineHeight: '32px',
                        //   fontWeight: '600',
                        //   color: '#005657',
                        //   backgroundColor: '#ffffff',
                        // }}
                        id="companyName"
                        placeholder="Enter company name"
                        required
                        type="text"
                        value={formData.companyName}
                        onChange={(e) => updateFormData('companyName', e.target.value)}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#1a7070';
                          e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#bec9c8';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* Industry */}
                    <div className="space-y-2">
                      <label
                        htmlFor="industry"
                        style={{
                          fontFamily: 'Geist, sans-serif',
                          fontSize: '12px',
                          lineHeight: '14px',
                          fontWeight: '500',
                          color: '#6f7979',
                        }}
                      >
                        Industry
                      </label>
                      <input
                        className="w-full py-3 px-4 rounded-lg outline-none transition-all"
                        style={{
                          border: '1px solid #bec9c8',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '16px',
                          color: '#0b1c30',
                          backgroundColor: '#ffffff',
                        }}
                        id="industry"
                        placeholder="e.g. Fintech, Healthcare"
                        required
                        type="text"
                        value={formData.industry}
                        onChange={(e) => updateFormData('industry', e.target.value)}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#1a7070';
                          e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#bec9c8';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* Website */}
                    <div className="space-y-2">
                      <label
                        htmlFor="website"
                        style={{
                          fontFamily: 'Geist, sans-serif',
                          fontSize: '12px',
                          lineHeight: '14px',
                          fontWeight: '500',
                          color: '#6f7979',
                        }}
                      >
                        Website
                      </label>
                      <div className="flex">
                        <span
                          className="inline-flex items-center px-3 rounded-l-lg"
                          style={{
                            border: '1px solid #bec9c8',
                            borderRight: 'none',
                            backgroundColor: '#dce9ff',
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '14px',
                            color: '#3f4948',
                          }}
                        >
                          https://
                        </span>
                        <input
                          className="w-full py-3 px-4 rounded-r-lg outline-none transition-all"
                          style={{
                            border: '1px solid #bec9c8',
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '16px',
                            color: '#0b1c30',
                            backgroundColor: '#ffffff',
                          }}
                          id="website"
                          placeholder="example.com"
                          type="text"
                          value={formData.website}
                          onChange={(e) => updateFormData('website', e.target.value)}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#1a7070';
                            e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                            const span = e.target.previousElementSibling as HTMLElement;
                            if (span) span.style.borderColor = '#1a7070';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#bec9c8';
                            e.target.style.boxShadow = 'none';
                            const span = e.target.previousElementSibling as HTMLElement;
                            if (span) span.style.borderColor = '#bec9c8';
                          }}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                      <label
                        htmlFor="description"
                        style={{
                          fontFamily: 'Geist, sans-serif',
                          fontSize: '12px',
                          lineHeight: '14px',
                          fontWeight: '500',
                          color: '#6f7979',
                        }}
                      >
                        Description
                      </label>
                      <textarea
                        className="w-full py-3 px-4 rounded-lg outline-none transition-all resize-none"
                        style={{
                          border: '1px solid #bec9c8',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '16px',
                          color: '#0b1c30',
                          backgroundColor: '#ffffff',
                          minHeight: '100px',
                        }}
                        id="description"
                        placeholder="Tell us about your organization..."
                        rows={4}
                        value={formData.description}
                        onChange={(e) => updateFormData('description', e.target.value)}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#1a7070';
                          e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#bec9c8';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* Company Size & Location Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label
                          htmlFor="companySize"
                          style={{
                            fontFamily: 'Geist, sans-serif',
                            fontSize: '12px',
                            lineHeight: '14px',
                            fontWeight: '500',
                            color: '#6f7979',
                          }}
                        >
                          Company Size
                        </label>
                        <select
                          className="w-full py-3 px-4 rounded-lg outline-none transition-all"
                          style={{
                            border: '1px solid #bec9c8',
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '16px',
                            color: '#0b1c30',
                            backgroundColor: '#ffffff',
                          }}
                          id="companySize"
                          required
                          value={formData.companySize}
                          onChange={(e) => updateFormData('companySize', e.target.value)}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#1a7070';
                            e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#bec9c8';
                            e.target.style.boxShadow = 'none';
                          }}
                        >
                          <option value="">Select size</option>
                          <option value="1-10">1-10 employees</option>
                          <option value="11-50">11-50 employees</option>
                          <option value="51-200">51-200 employees</option>
                          <option value="201-500">201-500 employees</option>
                          <option value="501-1000">501-1000 employees</option>
                          <option value="1000+">1000+ employees</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor="location"
                          style={{
                            fontFamily: 'Geist, sans-serif',
                            fontSize: '12px',
                            lineHeight: '14px',
                            fontWeight: '500',
                            color: '#6f7979',
                          }}
                        >
                          Location
                        </label>
                        <input
                          className="w-full py-3 px-4 rounded-lg outline-none transition-all"
                          style={{
                            border: '1px solid #bec9c8',
                            fontFamily: 'Inter, sans-serif',
                            fontSize: '16px',
                            color: '#0b1c30',
                            backgroundColor: '#ffffff',
                          }}
                          id="location"
                          placeholder="e.g. New York, USA"
                          type="text"
                          value={formData.location}
                          onChange={(e) => updateFormData('location', e.target.value)}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#1a7070';
                            e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#bec9c8';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: Market */}
                {currentStep === 'market' && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Target Customers */}
                    <div
                      className="p-6 rounded-xl transition-shadow hover:shadow-md"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #bec9c8',
                      }}
                    >
                      <label
                        htmlFor="targetCustomers"
                        className="flex items-center gap-2 mb-1"
                        style={{
                          fontFamily: 'Geist, sans-serif',
                          fontSize: '14px',
                          lineHeight: '16px',
                          fontWeight: '500',
                          color: '#0b1c30',
                        }}
                      >
                        Target Customers
                      </label>
                      <p
                        className="mb-4 italic"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '14px',
                          lineHeight: '20px',
                          color: '#3f4948',
                        }}
                      >
                        Define the segments or ideal buyer personas your solutions serve.
                      </p>
                      <textarea
                        className="w-full py-3 px-4 rounded-lg outline-none transition-all resize-none"
                        style={{
                          border: '1px solid #bec9c8',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '16px',
                          color: '#0b1c30',
                          backgroundColor: '#f8f9ff',
                          minHeight: '100px',
                        }}
                        id="targetCustomers"
                        placeholder="e.g., Enterprise firms in North America looking to automate data workflows..."
                        rows={4}
                        value={formData.targetCustomers}
                        onChange={(e) => updateFormData('targetCustomers', e.target.value)}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#1a7070';
                          e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#bec9c8';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>

                    {/* Known Competitors */}
                    <div
                      className="p-6 rounded-xl transition-shadow hover:shadow-md"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #bec9c8',
                      }}
                    >
                      <label
                        className="mb-1 block"
                        style={{
                          fontFamily: 'Geist, sans-serif',
                          fontSize: '14px',
                          lineHeight: '16px',
                          fontWeight: '500',
                          color: '#0b1c30',
                        }}
                      >
                        Known Competitors
                      </label>
                      <p
                        className="mb-4"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '14px',
                          lineHeight: '20px',
                          color: '#3f4948',
                        }}
                      >
                        Select major players in your space or add custom ones.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {defaultCompetitors.map((competitor) => {
                          const isSelected = formData.competitors.includes(competitor);
                          return (
                            <button
                              key={competitor}
                              type="button"
                              onClick={() => toggleCompetitor(competitor)}
                              className="px-4 py-2 rounded-full transition-all flex items-center gap-1"
                              style={{
                                border: `1px solid ${isSelected ? '#1a7070' : '#bec9c8'}`,
                                backgroundColor: isSelected
                                  ? 'rgba(163, 237, 236, 0.3)'
                                  : '#ffffff',
                                color: isSelected ? '#005657' : '#3f4948',
                                fontFamily: 'Geist, sans-serif',
                                fontSize: '14px',
                                fontWeight: '500',
                              }}
                            >
                              {competitor}
                              {isSelected && <Check size={16} />}
                            </button>
                          );
                        })}
                        {formData.competitors
                          .filter((c) => !defaultCompetitors.includes(c))
                          .map((competitor) => (
                            <button
                              key={competitor}
                              type="button"
                              onClick={() => removeCompetitor(competitor)}
                              className="px-4 py-2 rounded-full transition-all flex items-center gap-1"
                              style={{
                                border: '1px solid #1a7070',
                                backgroundColor: 'rgba(163, 237, 236, 0.3)',
                                color: '#005657',
                                fontFamily: 'Geist, sans-serif',
                                fontSize: '14px',
                                fontWeight: '500',
                              }}
                            >
                              {competitor}
                              <X size={16} />
                            </button>
                          ))}
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Add other"
                            value={newCompetitor}
                            onChange={(e) => setNewCompetitor(e.target.value)}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addCustomCompetitor();
                              }
                            }}
                            className="px-4 py-2 rounded-full transition-all"
                            style={{
                              border: '1px dashed #bec9c8',
                              color: '#3f4948',
                              fontFamily: 'Geist, sans-serif',
                              fontSize: '14px',
                              width: '150px',
                            }}
                          />
                          {newCompetitor && (
                            <button
                              type="button"
                              onClick={addCustomCompetitor}
                              className="absolute right-2 top-1/2 -translate-y-1/2"
                              style={{ color: '#1a7070' }}
                            >
                              <Plus size={18} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Current Challenges */}
                    <div
                      className="p-6 rounded-xl transition-shadow hover:shadow-md"
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #bec9c8',
                      }}
                    >
                      <label
                        htmlFor="challenges"
                        className="flex items-center gap-2 mb-1"
                        style={{
                          fontFamily: 'Geist, sans-serif',
                          fontSize: '14px',
                          lineHeight: '16px',
                          fontWeight: '500',
                          color: '#0b1c30',
                        }}
                      >
                        Current Challenges
                      </label>
                      <p
                        className="mb-4"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '14px',
                          lineHeight: '20px',
                          color: '#3f4948',
                        }}
                      >
                        What are the primary hurdles facing your organization today?
                      </p>
                      <textarea
                        className="w-full py-3 px-4 rounded-lg outline-none transition-all resize-none"
                        style={{
                          border: '1px solid #bec9c8',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '16px',
                          color: '#0b1c30',
                          backgroundColor: '#f8f9ff',
                          minHeight: '80px',
                        }}
                        id="challenges"
                        placeholder="e.g., Intense competition, talent retention, regulatory shifts..."
                        rows={3}
                        value={formData.challenges}
                        onChange={(e) => updateFormData('challenges', e.target.value)}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#1a7070';
                          e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#bec9c8';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Step 3: Goals */}
                {currentStep === 'goals' && (
                  <div className="space-y-8 animate-fade-in">
                    {/* Company Info Badge */}
                    {formData.companyName && (
                      <div
                        className="flex items-center gap-4 p-4 rounded-lg"
                        style={{
                          backgroundColor: '#eff4ff',
                          borderLeft: '4px solid #1a7070',
                        }}
                      >
                        <div
                          className="w-12 h-12 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: '#a3f0ef' }}
                        >
                          <Building2 size={24} style={{ color: '#005657' }} />
                        </div>
                        <div>
                          <h3
                            style={{
                              fontFamily: 'Geist, sans-serif',
                              fontSize: '14px',
                              fontWeight: '600',
                              color: '#0b1c30',
                            }}
                          >
                            {formData.companyName}
                          </h3>
                          <p
                            style={{
                              fontFamily: 'Inter, sans-serif',
                              fontSize: '14px',
                              color: '#3f4948',
                            }}
                          >
                            {formData.industry || 'Your Industry'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Product or Service */}
                    <div className="space-y-2">
                      <label
                        htmlFor="offerings"
                        className="flex items-center gap-2"
                        style={{
                          fontFamily: 'Geist, sans-serif',
                          fontSize: '14px',
                          lineHeight: '16px',
                          fontWeight: '500',
                          color: '#0b1c30',
                        }}
                      >
                        Product or Service
                        <Info size={16} style={{ color: '#6f7979' }} />
                      </label>
                      <textarea
                        className="w-full py-4 px-4 rounded-lg outline-none transition-all resize-none"
                        style={{
                          border: '1px solid #bec9c8',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '16px',
                          color: '#0b1c30',
                          backgroundColor: '#f8f9ff',
                          minHeight: '100px',
                        }}
                        id="offerings"
                        placeholder="e.g. Enterprise AI solutions, AI Studio, AI-powered digital transformation services..."
                        rows={4}
                        value={formData.offerings}
                        onChange={(e) => updateFormData('offerings', e.target.value)}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#1a7070';
                          e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#bec9c8';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <p
                        style={{
                          fontFamily: 'Geist, sans-serif',
                          fontSize: '12px',
                          lineHeight: '14px',
                          color: '#3f4948',
                        }}
                      >
                        Describe the core value proposition of your organization.
                      </p>
                    </div>

                    {/* Business Goals */}
                    <div className="space-y-2">
                      <label
                        htmlFor="businessGoals"
                        className="flex items-center gap-2"
                        style={{
                          fontFamily: 'Geist, sans-serif',
                          fontSize: '14px',
                          lineHeight: '16px',
                          fontWeight: '500',
                          color: '#0b1c30',
                        }}
                      >
                        Business Goals
                        <Flag size={16} style={{ color: '#6f7979' }} />
                      </label>
                      <textarea
                        className="w-full py-4 px-4 rounded-lg outline-none transition-all resize-none"
                        style={{
                          border: '1px solid #bec9c8',
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '16px',
                          color: '#0b1c30',
                          backgroundColor: '#f8f9ff',
                          minHeight: '100px',
                        }}
                        id="businessGoals"
                        placeholder="e.g. Expand deployment, scale talent programs, pioneer AI democratization..."
                        rows={4}
                        value={formData.businessGoals}
                        onChange={(e) => updateFormData('businessGoals', e.target.value)}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#1a7070';
                          e.target.style.boxShadow = '0 0 0 2px rgba(26, 112, 112, 0.2)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#bec9c8';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <p
                        style={{
                          fontFamily: 'Geist, sans-serif',
                          fontSize: '12px',
                          lineHeight: '14px',
                          color: '#3f4948',
                        }}
                      >
                        Define what success looks like in the next 12 months.
                      </p>
                    </div>

                    {/* Info Banner */}
                    <div
                      className="flex items-start gap-3 p-4 rounded-xl"
                      style={{
                        backgroundColor: 'rgba(26, 112, 112, 0.05)',
                        border: '1px solid rgba(26, 112, 112, 0.2)',
                      }}
                    >
                      <Info size={20} style={{ color: '#1a7070', flexShrink: 0 }} />
                      <p
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '14px',
                          lineHeight: '20px',
                          color: '#3f4948',
                        }}
                      >
                        This information helps us tailor your Knowledge Base and AI Personas to
                        your specific business ecosystem.
                      </p>
                    </div>
                  </div>
                )}

                {/* Form Navigation */}
                <div
                  className="pt-8 mt-8 flex justify-between items-center"
                  style={{ borderTop: '1px solid #bec9c8' }}
                >
                  {currentStep !== 'profile' && (
                    <button
                      type="button"
                      onClick={(e) => handleBack(e)}
                      className="px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2"
                      style={{
                        border: '1px solid #bec9c8',
                        color: '#3f4948',
                        fontFamily: 'Geist, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = '#e5eeff')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = 'transparent')
                      }
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>
                  )}

                  <div className="flex-1"></div>

                  {currentStep !== 'goals' ? (
                    <button
                      type="button"
                      onClick={(e) => handleNext(e)}
                      className="px-8 py-2.5 rounded-lg transition-all active:scale-95 flex items-center gap-2 shadow-md"
                      style={{
                        backgroundColor: '#1a7070',
                        color: '#ffffff',
                        fontFamily: 'Geist, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.9')}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      Next
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-10 py-2.5 rounded-lg transition-all active:scale-95 flex items-center gap-2 shadow-md"
                      style={{
                        backgroundColor: isSubmitting ? '#6f7979' : '#1a7070',
                        color: '#ffffff',
                        fontFamily: 'Geist, sans-serif',
                        fontSize: '14px',
                        fontWeight: '500',
                      }}
                      onMouseEnter={(e) => {
                        if (!isSubmitting) e.currentTarget.style.opacity = '0.9';
                      }}
                      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="animate-spin">⟳</span>
                          Processing...
                        </>
                      ) : (
                        <>
                          Complete Setup
                          <Rocket size={16} />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Back Link */}
            <div className="mt-8 text-center">
              <Link
                className="inline-flex items-center gap-2 transition-colors"
                href="/register"
                style={{
                  fontFamily: 'Geist, sans-serif',
                  fontSize: '14px',
                  lineHeight: '16px',
                  fontWeight: '500',
                  color: '#6f7979',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#005657')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#6f7979')}
              >
                <ArrowLeft size={16} />
                Back to Individual Registration
              </Link>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-6 text-center relative z-10">
          <p
            style={{
              fontFamily: 'Geist, sans-serif',
              fontSize: '12px',
              lineHeight: '14px',
              color: '#6f7979',
            }}
          >
            © 2024 PersonaFlow • Secure Enterprise Authentication • Powered by AI
          </p>
        </footer>
      </div>

      {/* Success Overlay */}
      {showSuccess && (
        <div
          className="fixed inset-0 backdrop-blur-md z-50 flex flex-col items-center justify-center transition-opacity duration-500"
          style={{
            backgroundColor: 'rgba(248, 249, 255, 0.95)',
            animation: 'fadeIn 0.5s ease-out',
          }}
        >
          <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center text-center max-w-sm">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-6"
              style={{ backgroundColor: 'rgba(26, 112, 112, 0.1)' }}
            >
              <span
                className="material-symbols-outlined text-4xl"
                style={{
                  fontVariationSettings: "'FILL' 1",
                  color: '#1a7070',
                }}
              >
                check_circle
              </span>
            </div>
            <h2
              className="mb-2"
              style={{
                fontFamily: 'Hanken Grotesk, sans-serif',
                fontSize: '24px',
                lineHeight: '32px',
                fontWeight: '600',
                color: '#0b1c30',
              }}
            >
              Organization Registered!
            </h2>
            <p
              className="mb-8"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontSize: '16px',
                lineHeight: '24px',
                color: '#3f4948',
              }}
            >
              Your organization is now set up. Redirecting to your dashboard...
            </p>
            <div
              className="w-12 h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: '#d3e4fe' }}
            >
              <div
                className="h-full"
                style={{
                  width: '40%',
                  backgroundColor: '#1a7070',
                  animation: 'progress 1.5s ease-in-out infinite',
                }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
