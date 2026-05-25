"use client";

import Link from "next/link";
import { useState } from "react";
import { FormModal } from "@/app/components/modals/FormModal";
import { useToast } from "@/app/components/Toast";
import type {
  EducationInstitution,
  EducationProgramme,
  EducationScholarship,
} from "@/app/lib/api/educationCatalogAdminApi";
import {
  useCreateEducationFaculty,
  useCreateEducationInstitution,
  useCreateEducationProgramme,
  useCreateEducationScholarship,
  useEducationFaculties,
  useEducationInstitutions,
  useEducationProgrammes,
  useEducationScholarships,
  useUpdateEducationInstitution,
  useUpdateEducationProgramme,
  useUpdateEducationScholarship,
} from "@/app/lib/query/hooks";

export default function EducationCatalogPage() {
  const [tab, setTab] = useState<"institutions" | "scholarships">("institutions");
  const isInstitutionsTab = tab === "institutions";

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/portal/orbit"
          className="text-sm text-violet-600 hover:text-violet-800 inline-flex items-center gap-1 mb-2"
        >
          ← Orbit admin hub
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Education catalog</h1>
        <p className="text-gray-600 mt-1 text-sm max-w-2xl">
          The owner-verified institutions, faculties, programmes and scholarships that FuturePath
          matches students against. Admission marks themselves flow in via FuturePath Admissions.
        </p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setTab("institutions")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${isInstitutionsTab ? "border-violet-600 text-violet-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
        >
          Institutions & Programmes
        </button>
        <button
          type="button"
          onClick={() => setTab("scholarships")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${isInstitutionsTab ? "border-transparent text-gray-500 hover:text-gray-700" : "border-violet-600 text-violet-700"}`}
        >
          Scholarships
        </button>
      </div>

      {isInstitutionsTab ? <InstitutionsPanel /> : <ScholarshipsPanel />}
    </div>
  );
}

function InstitutionsPanel() {
  const { showToast } = useToast();
  const institutionsQuery = useEducationInstitutions();
  const institutionsData = institutionsQuery.data;
  const institutions = institutionsData || [];

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const facultiesQuery = useEducationFaculties(selectedId);
  const programmesQuery = useEducationProgrammes(selectedId);
  const facultiesData = facultiesQuery.data;
  const faculties = facultiesData || [];
  const programmesData = programmesQuery.data;
  const programmes = programmesData || [];

  const createInstitution = useCreateEducationInstitution();
  const updateInstitution = useUpdateEducationInstitution();
  const createFaculty = useCreateEducationFaculty();
  const createProgramme = useCreateEducationProgramme();
  const updateProgramme = useUpdateEducationProgramme(selectedId);

  const creatingInstitution = createInstitution.isPending;
  const updatingInstitution = updateInstitution.isPending;
  const savingInstitution = creatingInstitution || updatingInstitution;
  const creatingProgramme = createProgramme.isPending;
  const updatingProgramme = updateProgramme.isPending;
  const savingProgramme = creatingProgramme || updatingProgramme;

  const [isInstOpen, setIsInstOpen] = useState(false);
  const [instEditingId, setInstEditingId] = useState<string | null>(null);
  const [instCode, setInstCode] = useState("");
  const [instName, setInstName] = useState("");
  const [instCountry, setInstCountry] = useState("ZA");

  const [isFacOpen, setIsFacOpen] = useState(false);
  const [facCode, setFacCode] = useState("");
  const [facName, setFacName] = useState("");

  const [isProgOpen, setIsProgOpen] = useState(false);
  const [progEditingId, setProgEditingId] = useState<string | null>(null);
  const [progCode, setProgCode] = useState("");
  const [progName, setProgName] = useState("");
  const [progFacultyId, setProgFacultyId] = useState("");
  const [progCluster, setProgCluster] = useState("");

  const selectedInstitution = institutions.find((item) => item.id === selectedId);
  const selectedName = selectedInstitution ? selectedInstitution.name : null;

  const openCreateInstitution = () => {
    setInstEditingId(null);
    setInstCode("");
    setInstName("");
    setInstCountry("ZA");
    setIsInstOpen(true);
  };

  const openEditInstitution = (institution: EducationInstitution) => {
    const country = institution.country;
    setInstEditingId(institution.id);
    setInstCode(institution.code);
    setInstName(institution.name);
    setInstCountry(country || "");
    setIsInstOpen(true);
  };

  const submitInstitution = async () => {
    const code = instCode.trim();
    const name = instName.trim();
    const country = instCountry.trim();
    if (!code || !name) {
      showToast("Code and name are required.", "error");
      return;
    }
    try {
      if (instEditingId) {
        await updateInstitution.mutateAsync({
          id: instEditingId,
          input: { name, country: country ? country : null },
        });
      } else {
        await createInstitution.mutateAsync({ code, name, country: country ? country : null });
      }
      showToast(instEditingId ? "Institution updated." : "Institution added.", "success");
      setIsInstOpen(false);
    } catch {
      showToast("Could not save the institution — please try again.", "error");
    }
  };

  const submitFaculty = async () => {
    if (!selectedId) return;
    const code = facCode.trim();
    const name = facName.trim();
    if (!code || !name) {
      showToast("Code and name are required.", "error");
      return;
    }
    try {
      await createFaculty.mutateAsync({ institutionId: selectedId, code, name });
      showToast("Faculty added.", "success");
      setFacCode("");
      setFacName("");
      setIsFacOpen(false);
    } catch {
      showToast("Could not save the faculty — please try again.", "error");
    }
  };

  const openCreateProgramme = () => {
    setProgEditingId(null);
    setProgCode("");
    setProgName("");
    setProgFacultyId("");
    setProgCluster("");
    setIsProgOpen(true);
  };

  const openEditProgramme = (programme: EducationProgramme) => {
    const facultyId = programme.facultyId;
    const cluster = programme.careerCluster;
    setProgEditingId(programme.id);
    setProgCode(programme.code);
    setProgName(programme.name);
    setProgFacultyId(facultyId || "");
    setProgCluster(cluster || "");
    setIsProgOpen(true);
  };

  const submitProgramme = async () => {
    if (!selectedId) return;
    const code = progCode.trim();
    const name = progName.trim();
    const cluster = progCluster.trim();
    const facultyId = progFacultyId ? progFacultyId : null;
    if (!code || !name) {
      showToast("Code and name are required.", "error");
      return;
    }
    try {
      if (progEditingId) {
        await updateProgramme.mutateAsync({
          programmeId: progEditingId,
          input: { name, facultyId, careerCluster: cluster ? cluster : null },
        });
      } else {
        await createProgramme.mutateAsync({
          institutionId: selectedId,
          facultyId,
          code,
          name,
          careerCluster: cluster ? cluster : null,
        });
      }
      showToast(progEditingId ? "Programme updated." : "Programme added.", "success");
      setIsProgOpen(false);
    } catch {
      showToast("Could not save the programme — please try again.", "error");
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-900">Institutions</h2>
          <button
            type="button"
            onClick={openCreateInstitution}
            className="text-sm font-medium text-violet-600 hover:text-violet-800"
          >
            + Add
          </button>
        </div>
        {institutionsQuery.isLoading ? (
          <p className="text-sm text-gray-500">Loading…</p>
        ) : institutions.length === 0 ? (
          <p className="text-sm text-gray-500">No institutions yet.</p>
        ) : (
          <ul className="space-y-1">
            {institutions.map((institution) => {
              const isSelected = institution.id === selectedId;
              return (
                <li key={institution.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(institution.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm ${isSelected ? "bg-violet-50 text-violet-800 font-medium" : "hover:bg-gray-50 text-gray-700"}`}
                  >
                    <span className="font-mono text-xs text-gray-400 mr-2">{institution.code}</span>
                    {institution.name}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="lg:col-span-2 space-y-6">
        {selectedId ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">{selectedName}</h2>
              <button
                type="button"
                onClick={() => {
                  if (selectedInstitution) openEditInstitution(selectedInstitution);
                }}
                className="text-sm text-violet-600 hover:text-violet-800 font-medium"
              >
                Edit institution
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Faculties</h3>
                <button
                  type="button"
                  onClick={() => setIsFacOpen(true)}
                  className="text-sm font-medium text-violet-600 hover:text-violet-800"
                >
                  + Add faculty
                </button>
              </div>
              {faculties.length === 0 ? (
                <p className="text-sm text-gray-500">No faculties yet.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {faculties.map((faculty) => (
                    <li
                      key={faculty.id}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 text-sm text-gray-700"
                    >
                      <span className="font-mono text-xs text-gray-400 mr-1">{faculty.code}</span>
                      {faculty.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900">Programmes</h3>
                <button
                  type="button"
                  onClick={openCreateProgramme}
                  className="text-sm font-medium text-violet-600 hover:text-violet-800"
                >
                  + Add programme
                </button>
              </div>
              {programmes.length === 0 ? (
                <p className="text-sm text-gray-500">No programmes yet.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="py-2 font-medium">Code</th>
                      <th className="py-2 font-medium">Name</th>
                      <th className="py-2 font-medium">Career cluster</th>
                      <th className="py-2 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {programmes.map((programme) => {
                      const clusterValue = programme.careerCluster;
                      const cluster = clusterValue || "—";
                      return (
                        <tr key={programme.id} className="text-gray-900">
                          <td className="py-2 font-mono text-xs text-gray-500">{programme.code}</td>
                          <td className="py-2">{programme.name}</td>
                          <td className="py-2 text-gray-500">{cluster}</td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              onClick={() => openEditProgramme(programme)}
                              className="text-violet-600 hover:text-violet-800 font-medium"
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
            Select an institution to manage its faculties and programmes.
          </div>
        )}
      </div>

      <FormModal
        isOpen={isInstOpen}
        onClose={() => setIsInstOpen(false)}
        onSubmit={submitInstitution}
        title={instEditingId ? "Edit institution" : "Add institution"}
        submitLabel={instEditingId ? "Save changes" : "Add institution"}
        loading={savingInstitution}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="instCode" className="block text-sm font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              id="instCode"
              type="text"
              value={instCode}
              onChange={(e) => setInstCode(e.target.value)}
              disabled={Boolean(instEditingId)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
              placeholder="e.g. UCT"
            />
          </div>
          <div>
            <label htmlFor="instName" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="instName"
              type="text"
              value={instName}
              onChange={(e) => setInstName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g. University of Cape Town"
            />
          </div>
          <div>
            <label htmlFor="instCountry" className="block text-sm font-medium text-gray-700 mb-1">
              Country code <span className="text-gray-400">(2 letters)</span>
            </label>
            <input
              id="instCountry"
              type="text"
              maxLength={2}
              value={instCountry}
              onChange={(e) => setInstCountry(e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="ZA"
            />
          </div>
        </div>
      </FormModal>

      <FormModal
        isOpen={isFacOpen}
        onClose={() => setIsFacOpen(false)}
        onSubmit={submitFaculty}
        title="Add faculty"
        submitLabel="Add faculty"
        loading={createFaculty.isPending}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="facCode" className="block text-sm font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              id="facCode"
              type="text"
              value={facCode}
              onChange={(e) => setFacCode(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g. ENG"
            />
          </div>
          <div>
            <label htmlFor="facName" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="facName"
              type="text"
              value={facName}
              onChange={(e) => setFacName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g. Faculty of Engineering"
            />
          </div>
        </div>
      </FormModal>

      <FormModal
        isOpen={isProgOpen}
        onClose={() => setIsProgOpen(false)}
        onSubmit={submitProgramme}
        title={progEditingId ? "Edit programme" : "Add programme"}
        submitLabel={progEditingId ? "Save changes" : "Add programme"}
        loading={savingProgramme}
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="progCode" className="block text-sm font-medium text-gray-700 mb-1">
              Code
            </label>
            <input
              id="progCode"
              type="text"
              value={progCode}
              onChange={(e) => setProgCode(e.target.value)}
              disabled={Boolean(progEditingId)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
              placeholder="e.g. BSC-ENG"
            />
          </div>
          <div>
            <label htmlFor="progName" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="progName"
              type="text"
              value={progName}
              onChange={(e) => setProgName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g. BSc Mechanical Engineering"
            />
          </div>
          <div>
            <label htmlFor="progFaculty" className="block text-sm font-medium text-gray-700 mb-1">
              Faculty <span className="text-gray-400">(optional)</span>
            </label>
            <select
              id="progFaculty"
              value={progFacultyId}
              onChange={(e) => setProgFacultyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">— None —</option>
              {faculties.map((faculty) => (
                <option key={faculty.id} value={faculty.id}>
                  {faculty.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="progCluster" className="block text-sm font-medium text-gray-700 mb-1">
              Career cluster <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="progCluster"
              type="text"
              value={progCluster}
              onChange={(e) => setProgCluster(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="e.g. Engineering"
            />
          </div>
        </div>
      </FormModal>
    </div>
  );
}

function ScholarshipsPanel() {
  const { showToast } = useToast();
  const scholarshipsQuery = useEducationScholarships();
  const scholarshipsData = scholarshipsQuery.data;
  const scholarships = scholarshipsData || [];
  const createScholarship = useCreateEducationScholarship();
  const updateScholarship = useUpdateEducationScholarship();
  const creatingScholarship = createScholarship.isPending;
  const updatingScholarship = updateScholarship.isPending;
  const savingScholarship = creatingScholarship || updatingScholarship;

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [country, setCountry] = useState("ZA");
  const [amountDisplay, setAmountDisplay] = useState("");
  const [criteria, setCriteria] = useState("");
  const [url, setUrl] = useState("");
  const [cluster, setCluster] = useState("");
  const [active, setActive] = useState(true);

  const openCreate = () => {
    setEditingId(null);
    setName("");
    setProvider("");
    setCountry("ZA");
    setAmountDisplay("");
    setCriteria("");
    setUrl("");
    setCluster("");
    setActive(true);
    setIsOpen(true);
  };

  const openEdit = (scholarship: EducationScholarship) => {
    const { country, amountDisplay, criteria, url, careerCluster } = scholarship;
    setEditingId(scholarship.id);
    setName(scholarship.name);
    setProvider(scholarship.provider);
    setCountry(country || "");
    setAmountDisplay(amountDisplay || "");
    setCriteria(criteria || "");
    setUrl(url || "");
    setCluster(careerCluster || "");
    setActive(scholarship.active);
    setIsOpen(true);
  };

  const submit = async () => {
    const trimmedName = name.trim();
    const trimmedProvider = provider.trim();
    if (!trimmedName || !trimmedProvider) {
      showToast("Name and provider are required.", "error");
      return;
    }
    const input = {
      name: trimmedName,
      provider: trimmedProvider,
      country: country.trim() ? country.trim() : null,
      amountDisplay: amountDisplay.trim() ? amountDisplay.trim() : null,
      criteria: criteria.trim() ? criteria.trim() : null,
      url: url.trim() ? url.trim() : null,
      careerCluster: cluster.trim() ? cluster.trim() : null,
      active,
    };
    try {
      if (editingId) {
        await updateScholarship.mutateAsync({ id: editingId, input });
      } else {
        await createScholarship.mutateAsync(input);
      }
      showToast(editingId ? "Scholarship updated." : "Scholarship added.", "success");
      setIsOpen(false);
    } catch {
      showToast("Could not save the scholarship — please try again.", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-violet-600 text-white hover:bg-violet-700"
        >
          Add scholarship
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {scholarshipsQuery.isLoading ? (
          <div className="p-8 text-center text-gray-500 text-sm">Loading scholarships…</div>
        ) : scholarships.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">No scholarships yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {scholarships.map((scholarship) => {
                const amountValue = scholarship.amountDisplay;
                const amount = amountValue || "—";
                const statusLabel = scholarship.active ? "Active" : "Inactive";
                const statusClass = scholarship.active
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-500";
                return (
                  <tr key={scholarship.id} className="text-gray-900">
                    <td className="px-4 py-3 font-medium">{scholarship.name}</td>
                    <td className="px-4 py-3 text-gray-600">{scholarship.provider}</td>
                    <td className="px-4 py-3 text-gray-600">{amount}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(scholarship)}
                        className="text-violet-600 hover:text-violet-800 font-medium"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <FormModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onSubmit={submit}
        title={editingId ? "Edit scholarship" : "Add scholarship"}
        submitLabel={editingId ? "Save changes" : "Add scholarship"}
        loading={savingScholarship}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="schName" className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                id="schName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="schProvider" className="block text-sm font-medium text-gray-700 mb-1">
                Provider
              </label>
              <input
                id="schProvider"
                type="text"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="schCountry" className="block text-sm font-medium text-gray-700 mb-1">
                Country code
              </label>
              <input
                id="schCountry"
                type="text"
                maxLength={2}
                value={country}
                onChange={(e) => setCountry(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label htmlFor="schAmount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount <span className="text-gray-400">(display)</span>
              </label>
              <input
                id="schAmount"
                type="text"
                value={amountDisplay}
                onChange={(e) => setAmountDisplay(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="e.g. Full tuition"
              />
            </div>
          </div>
          <div>
            <label htmlFor="schCluster" className="block text-sm font-medium text-gray-700 mb-1">
              Career cluster <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="schCluster"
              type="text"
              value={cluster}
              onChange={(e) => setCluster(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="schUrl" className="block text-sm font-medium text-gray-700 mb-1">
              URL <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="schUrl"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label htmlFor="schCriteria" className="block text-sm font-medium text-gray-700 mb-1">
              Criteria <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              id="schCriteria"
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="h-4 w-4 text-violet-600 border-gray-300 rounded"
            />
            Active (shown to students)
          </label>
        </div>
      </FormModal>
    </div>
  );
}
