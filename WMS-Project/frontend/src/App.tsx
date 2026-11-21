import { useEffect, useState } from "react";

interface Location {
  id: number;
  code: string;
  zone_type: string;
  max_weight_kg: number;
  is_occupied: number;
}

interface Product {
  id?: number;
  sku: string;
  name: string;
  category: string;
  weight_kg: number | string;
  location_code?: string;
}

function App() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedOccupiedLoc, setSelectedOccupiedLoc] =
    useState<Location | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const [selectedEmptyLoc, setSelectedEmptyLoc] = useState<Location | null>(
    null,
  );
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState<Product>({
    sku: "",
    name: "",
    category: "Standard",
    weight_kg: "",
  });

  const [isAutoAddModalOpen, setIsAutoAddModalOpen] = useState(false);
  const [autoProduct, setAutoProduct] = useState<Product>({
    sku: "",
    name: "",
    category: "Standard",
    weight_kg: "",
  });

  const loadData = async () => {
    try {
      const [resLoc, resProd] = await Promise.all([
        fetch("http://localhost:5000/api/locations"),
        fetch("http://localhost:5000/api/products"),
      ]);
      const dataLoc = await resLoc.json();
      const dataProd = await resProd.json();

      setLocations(dataLoc);
      setProductsList(dataProd);
      setLoading(false);
    } catch (err) {
      console.error("Błąd pobierania danych:", err);
    }
  };

  useEffect(() => {
    let ignore = false;

    const fetchInitialData = async () => {
      try {
        const [resLoc, resProd] = await Promise.all([
          fetch("http://localhost:5000/api/locations"),
          fetch("http://localhost:5000/api/products"),
        ]);
        const dataLoc = await resLoc.json();
        const dataProd = await resProd.json();

        if (!ignore) {
          setLocations(dataLoc);
          setProductsList(dataProd);
          setLoading(false);
        }
      } catch (err) {
        console.error("Błąd pobierania danych:", err);
      }
    };

    fetchInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  const handleLocationClick = async (loc: Location) => {
    if (loc.is_occupied === 1) {
      try {
        const res = await fetch(
          `http://localhost:5000/api/locations/${loc.id}/product`,
        );
        if (res.ok) {
          const data = await res.json();
          setSelectedProduct(data);
          setSelectedOccupiedLoc(loc);
          setIsViewModalOpen(true);
        }
      } catch (err) {
        console.error("Błąd pobierania towaru:", err);
      }
    } else {
      setSelectedEmptyLoc(loc);
      setIsAddModalOpen(true);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmptyLoc) return;
    try {
      const res = await fetch("http://localhost:5000/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newProduct,
          location_id: selectedEmptyLoc.id,
          weight_kg: Number(newProduct.weight_kg),
        }),
      });
      if (res.ok) {
        setNewProduct({
          sku: "",
          name: "",
          category: "Standard",
          weight_kg: "",
        });
        setIsAddModalOpen(false);
        loadData();
      }
    } catch (err) {
      console.error("Błąd przy zapisie:", err);
    }
  };

  const handleRelease = async () => {
    if (!selectedOccupiedLoc) return;
    try {
      const res = await fetch(
        `http://localhost:5000/api/locations/${selectedOccupiedLoc.id}/product`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setIsViewModalOpen(false);
        loadData();
      }
    } catch (err) {
      console.error("Błąd wydawania:", err);
    }
  };

  const handleAutoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:5000/api/products/auto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...autoProduct,
          weight_kg: Number(autoProduct.weight_kg),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(
          `SUKCES: System WMS przydzielił miejsce na regał:\n➡️ ${data.assignedCode}`,
        );
        setAutoProduct({
          sku: "",
          name: "",
          category: "Standard",
          weight_kg: "",
        });
        setIsAutoAddModalOpen(false);
        loadData();
      } else {
        alert(`BŁĄD WMS:\n${data.error}`);
      }
    } catch (err) {
      console.error("Błąd algorytmu:", err);
    }
  };

  if (loading)
    return (
      <div className="p-10 text-xl font-bold text-gray-700">
        Ładowanie systemu WMS...
      </div>
    );

  const filteredLocations = locations.filter((loc) =>
    loc.code.toLowerCase().includes(searchTerm.toLowerCase()),
  );
  const totalSpots = locations.length;
  const occupiedSpots = locations.filter((l) => l.is_occupied === 1).length;
  const freeSpots = totalSpots - occupiedSpots;
  const occupancyRate =
    totalSpots === 0 ? 0 : Math.round((occupiedSpots / totalSpots) * 100);

  return (
    <div className="min-h-screen bg-gray-50 p-8 relative">
      <header className="mb-8 bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900">
            WMS Dashboard
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            Automatyzacja procesów magazynowych
          </p>
        </div>

        <div className="flex gap-8 items-center w-full md:w-auto">
          <div className="text-center">
            <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">
              Wolne
            </p>
            <p className="text-2xl font-bold text-green-600">{freeSpots}</p>
          </div>
          <div className="text-center border-r pr-8">
            <p className="text-sm text-gray-500 font-semibold uppercase tracking-wider">
              Zapełnienie
            </p>
            <p className="text-2xl font-bold text-slate-800">
              {occupancyRate}%
            </p>
          </div>
          <button
            onClick={() => setIsAutoAddModalOpen(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md"
          >
            Inteligentne Przyjęcie
          </button>
        </div>
      </header>

      <div className="mb-6 max-w-md">
        <input
          type="text"
          placeholder="Filtruj regały (np. D-01)..."
          className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-slate-800 bg-white shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-10">
        {filteredLocations.map((loc) => {
          const isOccupied = loc.is_occupied === 1;
          const bgClass = isOccupied
            ? "bg-red-50 border-red-200 hover:bg-red-100"
            : "bg-green-50 border-green-200 hover:bg-green-100";
          const textClass = isOccupied ? "text-red-700" : "text-green-700";

          return (
            <div
              key={loc.id}
              onClick={() => handleLocationClick(loc)}
              className={`p-4 rounded-xl border-2 shadow-sm transition-transform hover:scale-105 cursor-pointer flex flex-col justify-between ${bgClass}`}
            >
              <div className="flex justify-between items-center mb-3">
                <span
                  className={`text-lg font-bold tracking-tight ${textClass}`}
                >
                  {loc.code}
                </span>
                <div
                  className={`w-3 h-3 rounded-full ${isOccupied ? "bg-red-500" : "bg-green-500"}`}
                ></div>
              </div>
              <div className="text-xs text-gray-600 space-y-0.5">
                <p>{loc.zone_type}</p>
                <p className="font-semibold text-gray-800">
                  Max: {loc.max_weight_kg} kg
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border mt-8">
        <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-4">
          Lista asortymentu w magazynie
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 text-gray-600 text-sm">
                <th className="p-3 rounded-tl-lg font-semibold">Lokalizacja</th>
                <th className="p-3 font-semibold">Kod SKU</th>
                <th className="p-3 font-semibold">Nazwa towaru</th>
                <th className="p-3 font-semibold">Kategoria</th>
                <th className="p-3 rounded-tr-lg font-semibold">Waga (kg)</th>
              </tr>
            </thead>
            <tbody>
              {productsList.map((product) => (
                <tr
                  key={product.id}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="p-3 font-bold text-gray-800">
                    {product.location_code}
                  </td>
                  <td className="p-3 font-mono text-gray-600">{product.sku}</td>
                  <td className="p-3 text-gray-700">{product.name}</td>
                  <td className="p-3">
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-xs font-semibold">
                      {product.category}
                    </span>
                  </td>
                  <td className="p-3 text-gray-700">{product.weight_kg} kg</td>
                </tr>
              ))}
              {productsList.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-500">
                    Magazyn jest całkowicie pusty. Brak towarów.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAutoAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-96 border-t-8 border-blue-600">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-2">
              Automatyzacja WMS
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              System sam znajdzie odpowiednie gniazdo na podstawie wagi i strefy
              towaru.
            </p>
            <form onSubmit={handleAutoSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Kod SKU
                </label>
                <input
                  required
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={autoProduct.sku}
                  onChange={(e) =>
                    setAutoProduct({ ...autoProduct, sku: e.target.value })
                  }
                  placeholder="np. AUTO-001"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Nazwa towaru
                </label>
                <input
                  required
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={autoProduct.name}
                  onChange={(e) =>
                    setAutoProduct({ ...autoProduct, name: e.target.value })
                  }
                  placeholder="np. Europaleta z częściami"
                />
              </div>
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-sm text-gray-600 mb-1">
                    Strefa docelowa
                  </label>
                  <select
                    className="w-full border rounded-lg p-2 bg-white"
                    value={autoProduct.category}
                    onChange={(e) =>
                      setAutoProduct({
                        ...autoProduct,
                        category: e.target.value,
                      })
                    }
                  >
                    <option>Standard</option>
                    <option>Chłodnia</option>
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="block text-sm text-gray-600 mb-1">
                    Waga (kg)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    className="w-full border rounded-lg p-2"
                    value={autoProduct.weight_kg}
                    onChange={(e) =>
                      setAutoProduct({
                        ...autoProduct,
                        weight_kg: e.target.value,
                      })
                    }
                    placeholder="0.0"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAutoAddModalOpen(false)}
                  className="w-1/3 bg-gray-200 text-gray-800 font-semibold py-2.5 rounded-xl hover:bg-gray-300"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="w-2/3 bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700"
                >
                  Wyszukaj miejsce
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isViewModalOpen && selectedProduct && selectedOccupiedLoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-96">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">
              Szczegóły towaru
            </h2>
            <div className="space-y-3 text-gray-700 mb-6">
              <p className="flex justify-between">
                <span className="text-gray-500">Półka:</span>{" "}
                <span className="font-bold text-red-600">
                  {selectedOccupiedLoc.code}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">Kod (SKU):</span>{" "}
                <span className="font-mono font-medium">
                  {selectedProduct.sku}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">Nazwa:</span>{" "}
                <span className="font-bold">{selectedProduct.name}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">Kategoria:</span>{" "}
                <span className="bg-blue-100 text-blue-800 px-2 rounded-md text-sm">
                  {selectedProduct.category}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-gray-500">Waga:</span>{" "}
                <span>{selectedProduct.weight_kg} kg</span>
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="w-1/2 bg-gray-200 text-gray-800 font-semibold py-2.5 rounded-xl hover:bg-gray-300"
              >
                Zamknij
              </button>
              <button
                onClick={handleRelease}
                className="w-1/2 bg-red-600 text-white font-semibold py-2.5 rounded-xl hover:bg-red-700"
              >
                Wydaj towar
              </button>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && selectedEmptyLoc && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-96">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-2 mb-4">
              Przyjęcie na{" "}
              <span className="text-green-600">{selectedEmptyLoc.code}</span>
            </h2>
            <form onSubmit={handleAddSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Kod SKU
                </label>
                <input
                  required
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={newProduct.sku}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, sku: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">
                  Nazwa towaru
                </label>
                <input
                  required
                  type="text"
                  className="w-full border rounded-lg p-2"
                  value={newProduct.name}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, name: e.target.value })
                  }
                />
              </div>
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-sm text-gray-600 mb-1">
                    Kategoria
                  </label>
                  <select
                    className="w-full border rounded-lg p-2 bg-white"
                    value={newProduct.category}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, category: e.target.value })
                    }
                  >
                    <option>Standard</option>
                    <option>Chłodnia</option>
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="block text-sm text-gray-600 mb-1">
                    Waga (kg)
                  </label>
                  <input
                    required
                    type="number"
                    step="0.1"
                    className="w-full border rounded-lg p-2"
                    value={newProduct.weight_kg}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        weight_kg: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-1/2 bg-gray-200 text-gray-800 font-semibold py-2.5 rounded-xl hover:bg-gray-300"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-green-600 text-white font-semibold py-2.5 rounded-xl hover:bg-green-700"
                >
                  Wymuś przyjęcie
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
