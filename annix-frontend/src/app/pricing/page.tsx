'use client';

import React from 'react';
import Link from 'next/link';

const CheckIcon = () => (
  <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function PricingPage() {
  const customerTiers = [
    {
      name: 'Free',
      price: 'R0',
      period: '/month',
      description: 'Get started with basic RFQ management',
      features: [
        'Up to 5 RFQs per month',
        'Basic project management',
        'Email notifications',
        'Standard support',
      ],
      cta: 'Get Started',
      highlighted: false,
    },
    {
      name: 'Professional',
      price: 'R499',
      period: '/month',
      description: 'For growing businesses with more needs',
      features: [
        'Unlimited RFQs',
        'Advanced project management',
        'Priority email notifications',
        'Document attachments',
        'Quotation comparison tools',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      description: 'For large organizations with custom requirements',
      features: [
        'Everything in Professional',
        'Custom integrations',
        'Dedicated account manager',
        'API access',
        'SLA guarantees',
        'On-site training',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  const supplierTiers = [
    {
      name: 'Basic',
      price: 'R0',
      period: '/month',
      description: 'Start receiving RFQs',
      features: [
        'View up to 10 RFQs per month',
        'Submit quotations',
        'Basic profile listing',
        'Email notifications',
      ],
      cta: 'Join Free',
      highlighted: false,
    },
    {
      name: 'Growth',
      price: 'R799',
      period: '/month',
      description: 'Grow your supplier business',
      features: [
        'Unlimited RFQ access',
        'Featured supplier listing',
        'Priority RFQ notifications',
        'Quotation templates',
        'Analytics dashboard',
        'Priority support',
      ],
      cta: 'Start Free Trial',
      highlighted: true,
    },
    {
      name: 'Premium',
      price: 'R1,499',
      period: '/month',
      description: 'Maximum visibility and features',
      features: [
        'Everything in Growth',
        'Top placement in search',
        'Verified supplier badge',
        'Bulk quotation tools',
        'API access',
        'Dedicated support',
      ],
      cta: 'Start Free Trial',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that best fits your needs. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Customer Pricing */}
        <div className="mb-20">
          <div className="text-center mb-10">
            <span className="inline-flex items-center px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-4">
              For Customers
            </span>
            <h2 className="text-2xl font-bold text-gray-900">
              Customer Plans
            </h2>
            <p className="text-gray-600 mt-2">
              Create RFQs, receive quotations, and manage your procurement
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {customerTiers.map((tier) => (
              <div
                key={tier.name}
                className={`bg-white rounded-2xl shadow-lg p-8 ${
                  tier.highlighted
                    ? 'ring-2 ring-blue-500 transform scale-105'
                    : 'border border-gray-100'
                }`}
              >
                {tier.highlighted && (
                  <span className="inline-block px-3 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full mb-4">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                  <span className="ml-1 text-gray-500">{tier.period}</span>
                </div>
                <p className="mt-4 text-gray-600">{tier.description}</p>

                <ul className="mt-6 space-y-4">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckIcon />
                      <span className="ml-3 text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`mt-8 w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    tier.highlighted
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Supplier Pricing */}
        <div className="mb-16">
          <div className="text-center mb-10">
            <span className="inline-flex items-center px-4 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm font-semibold mb-4">
              For Suppliers
            </span>
            <h2 className="text-2xl font-bold text-gray-900">
              Supplier Plans
            </h2>
            <p className="text-gray-600 mt-2">
              Receive RFQs, submit quotations, and grow your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {supplierTiers.map((tier) => (
              <div
                key={tier.name}
                className={`bg-white rounded-2xl shadow-lg p-8 ${
                  tier.highlighted
                    ? 'ring-2 ring-indigo-500 transform scale-105'
                    : 'border border-gray-100'
                }`}
              >
                {tier.highlighted && (
                  <span className="inline-block px-3 py-1 bg-indigo-500 text-white text-xs font-semibold rounded-full mb-4">
                    Best Value
                  </span>
                )}
                <h3 className="text-xl font-bold text-gray-900">{tier.name}</h3>
                <div className="mt-4 flex items-baseline">
                  <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                  <span className="ml-1 text-gray-500">{tier.period}</span>
                </div>
                <p className="mt-4 text-gray-600">{tier.description}</p>

                <ul className="mt-6 space-y-4">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <CheckIcon />
                      <span className="ml-3 text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`mt-8 w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                    tier.highlighted
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-12">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Frequently Asked Questions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-gray-600">
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600">
                We accept all major credit cards, EFT, and debit orders for South African customers.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Is there a free trial?
              </h3>
              <p className="text-gray-600">
                Yes, all paid plans include a 14-day free trial. No credit card required.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">
                What happens if I exceed my plan limits?
              </h3>
              <p className="text-gray-600">
                We'll notify you when you're approaching your limits and suggest an upgrade. You won't lose access to existing data.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Have questions? We're here to help.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:sales@annix.co.za"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Sales
            </a>
            <Link
              href="/"
              className="inline-flex items-center px-6 py-3 bg-white text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors border border-gray-300"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
