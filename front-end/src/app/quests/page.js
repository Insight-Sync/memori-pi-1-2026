"use client";

import dynamic from "next/dynamic";
import { useState, useRef, useEffect, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { buildApiUrl, buildAssetUrl } from "@/lib/api";

import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false }
);

const getCustomIcon = () => {
  if (typeof window === "undefined") return null;

  const L = require("leaflet");

  return new L.Icon({
    iconUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconRetinaUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });
};

export default function QuestsCMS() {
  const [isMounted, setIsMounted] = useState(false);
  const [quests, setQuests] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [viewingImage, setViewingImage] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fileInputRef = useRef(null);
  const mapRef = useRef(null);

  const [formData, setFormData] = useState({
    id: null,
    nomeQuest: "",
    latitudeQuest: "",
    longitudeQuest: "",
    descricaoQuest: "",
    imagemQuest: "",
  });

  const isEditing = formData.id !== null;

  const loadQuests = useCallback(async () => {
    try {
      const res = await fetch(buildApiUrl("quest"));

      if (!res.ok) {
        throw new Error("Falha ao carregar quests");
      }

      const data = await res.json();

      const questsApi = Array.isArray(data.quests) ? data.quests : [];

      const mapped = questsApi.map((q) => ({
        ...q,
        id: q._id,
      }));

      setQuests(mapped);
    } catch (error) {
      console.error("Erro ao buscar quests:", error);
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
    void loadQuests();
  }, [loadQuests]);

  useEffect(() => {
    if (!mapRef.current || !isMounted) return;

    const handleMapClick = (e) => {
      setFormData((prev) => ({
        ...prev,
        latitudeQuest: parseFloat(e.latlng.lat.toFixed(6)),
        longitudeQuest: parseFloat(e.latlng.lng.toFixed(6)),
      }));
    };

    const map = mapRef.current;
    if (map && map.on) {
      map.on("click", handleMapClick);
      return () => {
        map.off("click", handleMapClick);
      };
    }
  }, [isMounted]);

  const handleFileUpload = async (e, field) => {
    const file = e.target.files[0];

    if (!file) return;

    setUploading(true);

    const data = new FormData();
    data.set("file", file);

    try {
      const res = await fetch(buildApiUrl("upload"), {
        method: "POST",
        body: data,
      });

      const result = await res.json();

      if (result.url) {
        setFormData((prev) => ({
          ...prev,
          [field]: result.url,
        }));
      }
    } catch (error) {
      console.error("Erro no upload:", error);

      setTimeout(() => {
        setFormData((prev) => ({
          ...prev,
          [field]: URL.createObjectURL(file),
        }));
      }, 800);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      nomeQuest: formData.nomeQuest,
      latitudeQuest: formData.latitudeQuest,
      longitudeQuest: formData.longitudeQuest,
      descricaoQuest: formData.descricaoQuest,
      imagemQuest: formData.imagemQuest,
    };

    try {
      const endpoint = isEditing
        ? buildApiUrl(`quest/${formData.id}`)
        : buildApiUrl("quest");

      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Falha ao salvar quest");
      }

      await loadQuests();
      handleCancel();
    } catch (error) {
      console.error("Erro ao salvar quest:", error);
    }
  };

  const handleEdit = (quest) => {
    setFormData({ ...quest });
  };

  const handleCancel = () => {
    setFormData({
      id: null,
      nomeQuest: "",
      latitudeQuest: "",
      longitudeQuest: "",
      descricaoQuest: "",
      imagemQuest: "",
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const confirmDelete = async () => {
    if (deleteConfirm) {
      try {
        const res = await fetch(
          buildApiUrl(`quest/${deleteConfirm.id}`),
          {
            method: "DELETE",
          }
        );

        if (!res.ok) {
          throw new Error("Falha ao excluir quest");
        }

        await loadQuests();
        setDeleteConfirm(null);
      } catch (error) {
        console.error("Erro ao excluir quest:", error);
      }
    }
  };

  const mapCenter = [
    formData.latitudeQuest || -24.49,
    formData.longitudeQuest || -47.844,
  ];

  return (
    <div className="flex min-h-screen bg-white font-sans text-gray-900">
      <Sidebar />

      <main className="flex-1 p-8 flex flex-col gap-8">
        <header className="border-b border-gray-200 pb-5">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Quests
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {isEditing
              ? `Editando a quest: ${formData.nomeQuest}`
              : "Crie, edite ou remova quests"}
          </p>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-x-8 gap-y-10">

          {/* FORMULÁRIO LATERAL */}
          <div className="xl:col-span-1">
            <form
              className="space-y-6 sticky top-8"
              onSubmit={handleSubmit}
            >
              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Nome da Quest
                </label>

                <div className="mt-2">
                  <input
                    type="text"
                    required
                    value={formData.nomeQuest}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        nomeQuest: e.target.value,
                      })
                    }
                    placeholder="Ex: Encontre o Servidor"
                    className="block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-red-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Latitude
                  </label>

                  <div className="mt-2">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="-23.5505"
                      value={formData.latitudeQuest}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          latitudeQuest:
                            parseFloat(e.target.value) || "",
                        })
                      }
                      className="block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-red-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-900">
                    Longitude
                  </label>

                  <div className="mt-2">
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="-46.6333"
                      value={formData.longitudeQuest}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          longitudeQuest:
                            parseFloat(e.target.value) || "",
                        })
                      }
                      className="block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-red-400"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-2">
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Clique no mapa para selecionar a localização
                </label>

                {isMounted ? (
                  <div className="h-56 w-full rounded-md overflow-hidden outline outline-1 outline-gray-300 relative z-0">
                    <MapContainer
                      ref={mapRef}
                      center={mapCenter}
                      zoom={13}
                      style={{
                        height: "100%",
                        width: "100%",
                      }}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution="&copy; OpenStreetMap"
                      />

                      {formData.latitudeQuest &&
                        formData.longitudeQuest && (
                          <Marker
                            position={[
                              formData.latitudeQuest,
                              formData.longitudeQuest,
                            ]}
                            icon={getCustomIcon()}
                          />
                        )}
                    </MapContainer>
                  </div>
                ) : (
                  <div className="h-56 w-full rounded-md bg-gray-100 animate-pulse outline outline-1 outline-gray-300 flex items-center justify-center">
                    <span className="text-sm text-gray-400">
                      Carregando mapa...
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Descrição da Missão
                </label>

                <div className="mt-2">
                  <textarea
                    rows={3}
                    required
                    value={formData.descricaoQuest}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        descricaoQuest: e.target.value,
                      })
                    }
                    placeholder="Instruções para o usuário..."
                    className="block w-full rounded-md bg-white px-3 py-2 text-sm text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-red-400 resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900">
                  Imagem da Capa
                </label>

                <div className="mt-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={(e) =>
                      handleFileUpload(e, "imagemQuest")
                    }
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 outline outline-1 -outline-offset-1 outline-gray-300 rounded-md bg-white cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex w-full justify-center rounded-md bg-red-400 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 transition-colors disabled:opacity-50"
                >
                  {uploading
                    ? "Processando Imagem..."
                    : isEditing
                    ? "Atualizar Quest"
                    : "Cadastrar Quest"}
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* LISTAGEM */}
          <div className="xl:col-span-3">
            <div className="overflow-hidden bg-white outline outline-1 -outline-offset-1 outline-gray-200 rounded-lg shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Quest & Localização
                    </th>

                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Descrição
                    </th>

                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Capa
                    </th>

                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-900 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-200 bg-white">
                  {quests.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-6 py-8 text-center text-sm font-medium text-gray-500"
                      >
                        Nenhuma quest cadastrada.
                      </td>
                    </tr>
                  ) : (
                    quests.map((quest) => (
                      <tr
                        key={quest.id}
                        className={
                          formData.id === quest.id
                            ? "bg-red-50/30"
                            : "hover:bg-gray-50/50 transition-colors"
                        }
                      >
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">
                            {quest.nomeQuest}
                          </div>

                          <div className="text-sm text-gray-500 mt-0.5">
                            Lat: {quest.latitudeQuest} | Lng:{" "}
                            {quest.longitudeQuest}
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <p className="text-sm text-gray-500 line-clamp-2 max-w-xs whitespace-normal">
                            {quest.descricaoQuest}
                          </p>
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-center">
                          {quest.imagemQuest ? (
                            <button
                              onClick={() =>
                                setViewingImage(
                                  buildAssetUrl(quest.imagemQuest)
                                )
                              }
                              className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 hover:bg-gray-100 transition-colors"
                            >
                              Ver Capa
                            </button>
                          ) : (
                            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-medium text-gray-400 ring-1 ring-inset ring-gray-500/10 opacity-60">
                              Sem Imagem
                            </span>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(quest)}
                            className="text-red-500 hover:text-red-400 mr-4 transition-colors"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => setDeleteConfirm(quest)}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* VISUALIZAÇÃO DA IMAGEM */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm"
          onClick={() => setViewingImage(null)}
        >
          <div
            className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl outline outline-1 outline-gray-200 overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-sm font-bold text-gray-900">
                Visualização de Capa
              </h3>

              <button
                onClick={() => setViewingImage(null)}
                className="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-md outline outline-1 outline-gray-200 shadow-sm transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-4 flex-1 flex justify-center items-center bg-gray-100 overflow-hidden inner-shadow">
              <img
                src={viewingImage}
                alt="Preview da Quest"
                className="max-w-full max-h-full rounded outline outline-1 outline-gray-200 object-contain bg-white shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DE EXCLUSÃO */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-500/75 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden outline outline-1 outline-gray-200">
            <div className="p-6 text-center">
              <h3 className="text-lg font-bold text-gray-900">
                Confirmar exclusão
              </h3>

              <p className="mt-2 text-sm text-gray-500">
                Remover a quest{" "}
                <span className="font-bold text-gray-900">
                  {deleteConfirm.nomeQuest}
                </span>
                ?
              </p>
            </div>

            <div className="flex bg-gray-50 p-4 gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm outline outline-1 -outline-offset-1 outline-gray-300 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>

              <button
                onClick={confirmDelete}
                className="flex-1 rounded-md bg-red-400 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-300 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}