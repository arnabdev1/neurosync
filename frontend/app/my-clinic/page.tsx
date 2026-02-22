"use client";

import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";

type ClinicTab =
  | "My Clinic"
  | "Doctor Profile"
  | "Insurance Details"
  | "Medical History"
  | "Schedule Appointment";

const sidebarItems: ClinicTab[] = [
  "My Clinic",
  "Doctor Profile",
  "Insurance Details",
  "Medical History",
  "Schedule Appointment",
];

const doctor = {
  name: "Dr. Maliha Rahman",
  specialty: "Neurologist / Preventive Care",
  email: "maliha.rahman@neurosync-health.org",
  phone: "+1 (555) 214-0091",
  license: "NPI-4471-NS-2201",
  availability: "Mon, Wed, Fri • 9:00 AM - 4:00 PM",
  location: "Cognitive Health Wing, Floor 3",
};

const insuranceDetails = {
  provider: "Aetna NeuroCare Plus",
  memberId: "NSX-AET-928114",
  groupNumber: "GRP-44092",
  planType: "PPO - Preventive Cognitive Care",
  coverage: [
    "Neurology consultations: 90% covered",
    "BCI follow-up and wearable telemetry review: 80% covered",
    "Urgent mental wellness triage sessions: 100% covered",
  ],
  renewalDate: "December 31, 2026",
};

const medicalHistory = [
  {
    date: "Feb 16, 2026",
    title: "High Stress Episode Follow-up",
    summary: "Reviewed 72-hour HRV variance and focus-fragmentation clusters from NeuroSync dashboard.",
    status: "Completed",
  },
  {
    date: "Jan 29, 2026",
    title: "Preventive Neurology Check-in",
    summary: "Adjusted behavioral protocol for sustained concentration blocks and sleep consistency.",
    status: "Completed",
  },
  {
    date: "Dec 21, 2025",
    title: "Baseline Cognitive Profile",
    summary: "Initial BCI-linked intake assessment and executive function baseline calibration.",
    status: "Archived",
  },
];

const appointmentSlots = [
  { day: "Monday", date: "Mar 02, 2026", slots: ["09:30 AM", "11:00 AM", "03:15 PM"] },
  { day: "Wednesday", date: "Mar 04, 2026", slots: ["10:00 AM", "01:30 PM"] },
  { day: "Friday", date: "Mar 06, 2026", slots: ["09:00 AM", "12:15 PM", "02:45 PM"] },
];

export default function MyClinicPage() {
  const [activeTab, setActiveTab] = useState<ClinicTab>("My Clinic");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const sectionTitle = useMemo(() => {
    if (activeTab === "My Clinic") return "My Clinic";
    return activeTab;
  }, [activeTab]);

  const renderTabContent = () => {
    if (activeTab === "My Clinic") {
      return (
        <div className="space-y-5">
          <article className="rounded-2xl border border-purple-200 bg-white p-5 sm:p-6 text-zinc-900 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-24px_rgba(76,29,149,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-700">
              Assigned Facility
            </p>
            <h3 className="mt-2 text-xl font-semibold">Neuro-Sync Affiliated Health Center</h3>
            <p className="mt-2 text-sm text-zinc-600">
              Integrated preventive care clinic connected to your BCI telemetry stream,
              cognitive trend reports, and autonomous intervention workflows.
            </p>
          </article>

          <article className="rounded-2xl border border-purple-200 bg-linear-to-br from-white to-purple-50 p-5 sm:p-6 text-zinc-900 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_rgba(91,33,182,0.45)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-700">
                  Primary Physician
                </p>
                <h3 className="mt-2 text-xl font-semibold">{doctor.name}</h3>
                <p className="mt-1 text-sm font-medium text-zinc-700">{doctor.specialty}</p>
              </div>

              <button className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700">
                Message Doctor
              </button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-purple-100 bg-white p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Email</p>
                <p className="mt-1 text-sm font-medium text-zinc-800">{doctor.email}</p>
              </div>
              <div className="rounded-xl border border-purple-100 bg-white p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Contact</p>
                <p className="mt-1 text-sm font-medium text-zinc-800">{doctor.phone}</p>
              </div>
            </div>
          </article>
        </div>
      );
    }

    if (activeTab === "Doctor Profile") {
      return (
        <div className="space-y-5">
          <article className="rounded-2xl border border-purple-200 bg-white p-6 text-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-700">Doctor Profile</p>
            <h3 className="mt-2 text-2xl font-semibold">{doctor.name}</h3>
            <p className="mt-1 text-sm font-medium text-zinc-700">{doctor.specialty}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">License</p>
                <p className="mt-1 text-sm font-semibold text-zinc-800">{doctor.license}</p>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Availability</p>
                <p className="mt-1 text-sm font-semibold text-zinc-800">{doctor.availability}</p>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Email</p>
                <p className="mt-1 text-sm font-semibold text-zinc-800">{doctor.email}</p>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Clinic Location</p>
                <p className="mt-1 text-sm font-semibold text-zinc-800">{doctor.location}</p>
              </div>
            </div>
          </article>
        </div>
      );
    }

    if (activeTab === "Insurance Details") {
      return (
        <div className="space-y-5">
          <article className="rounded-2xl border border-purple-200 bg-white p-6 text-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-700">Active Plan</p>
            <h3 className="mt-2 text-xl font-semibold">{insuranceDetails.provider}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Member ID</p>
                <p className="mt-1 text-sm font-semibold text-zinc-800">{insuranceDetails.memberId}</p>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Group Number</p>
                <p className="mt-1 text-sm font-semibold text-zinc-800">{insuranceDetails.groupNumber}</p>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/70 p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-widest text-zinc-500">Plan Type</p>
                <p className="mt-1 text-sm font-semibold text-zinc-800">{insuranceDetails.planType}</p>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-purple-100 bg-purple-50/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-700">Coverage Snapshot</p>
              <ul className="mt-3 space-y-2">
                {insuranceDetails.coverage.map((item) => (
                  <li key={item} className="text-sm text-zinc-700">
                    • {item}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-zinc-600">Plan renewal date: {insuranceDetails.renewalDate}</p>
            </div>
          </article>
        </div>
      );
    }

    if (activeTab === "Medical History") {
      return (
        <div className="space-y-4">
          {medicalHistory.map((entry) => (
            <article
              key={entry.date + entry.title}
              className="rounded-2xl border border-purple-200 bg-white p-5 text-zinc-900 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_34px_-24px_rgba(91,33,182,0.45)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-semibold">{entry.title}</h3>
                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-800 ring-1 ring-purple-200">
                  {entry.status}
                </span>
              </div>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-500">{entry.date}</p>
              <p className="mt-3 text-sm text-zinc-700">{entry.summary}</p>
            </article>
          ))}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <article className="rounded-2xl border border-purple-200 bg-white p-6 text-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-purple-700">
            Next Available Windows
          </p>
          <div className="mt-4 space-y-3">
            {appointmentSlots.map((slotGroup) => (
              <div key={slotGroup.date} className="rounded-xl border border-purple-100 bg-purple-50/60 p-4">
                <p className="text-sm font-semibold text-zinc-800">
                  {slotGroup.day} • {slotGroup.date}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {slotGroup.slots.map((slot) => (
                    <button
                      key={slot}
                      className="rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs font-semibold text-purple-800 transition-colors hover:bg-purple-100"
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button className="mt-5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700">
            Request Appointment
          </button>
        </article>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100">
      <Navbar />

      <main className="pt-24 pb-16 px-4 sm:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <h1 className="text-2xl font-bold text-white">My Clinic</h1>
            <button
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="inline-flex items-center justify-center rounded-lg border border-purple-200/40 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
              aria-label="Toggle clinic navigation"
            >
              ☰ Menu
            </button>
          </div>

          <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
            <aside
              className={`${
                mobileMenuOpen ? "block" : "hidden"
              } lg:block rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm`}
            >
              <p className="px-3 pb-3 pt-1 text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">
                Clinic Navigation
              </p>

              <nav className="space-y-1">
                {sidebarItems.map((item) => {
                  const isActive = item === activeTab;
                  return (
                    <button
                      key={item}
                      onClick={() => {
                        setActiveTab(item);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-purple-600 text-white shadow-[0_10px_24px_-16px_rgba(124,58,237,0.8)]"
                          : "text-zinc-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {item}
                    </button>
                  );
                })}
              </nav>
            </aside>

            <section className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6 lg:p-8 backdrop-blur-sm">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-300">
                  NeuroSync Care Network
                </p>
                <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-white">{sectionTitle}</h2>
              </div>

              {renderTabContent()}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
