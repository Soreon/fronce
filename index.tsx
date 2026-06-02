import React, { useState, useEffect } from 'react';

const CarteFranceSimple = () => {
  const [svgContent, setSvgContent] = useState(null);
  const [hoveredDep, setHoveredDep] = useState(null);
  const [activeTab, setActiveTab] = useState('carte');
  
  // Charger le SVG au chargement du composant
  useEffect(() => {
    const loadSvg = async () => {
      try {
        const response = await window.fs.readFile('paste.txt', { encoding: 'utf8' });
        setSvgContent(response);
      } catch (error) {
        console.error("Erreur lors du chargement du SVG:", error);
      }
    };
    
    loadSvg();
  }, []);

  // Dictionnaire des départements
  const departements = {
    "dep_01": { nom: "Ain", code: "01", region: "Auvergne-Rhône-Alpes", prefecture: "Bourg-en-Bresse" },
    "dep_02": { nom: "Aisne", code: "02", region: "Hauts-de-France", prefecture: "Laon" },
    "dep_03": { nom: "Allier", code: "03", region: "Auvergne-Rhône-Alpes", prefecture: "Moulins" },
    "dep_04": { nom: "Alpes-de-Haute-Provence", code: "04", region: "Provence-Alpes-Côte d'Azur", prefecture: "Digne-les-Bains" },
    "dep_05": { nom: "Hautes-Alpes", code: "05", region: "Provence-Alpes-Côte d'Azur", prefecture: "Gap" },
    "dep_06": { nom: "Alpes-Maritimes", code: "06", region: "Provence-Alpes-Côte d'Azur", prefecture: "Nice" },
    "dep_07": { nom: "Ardèche", code: "07", region: "Auvergne-Rhône-Alpes", prefecture: "Privas" },
    "dep_08": { nom: "Ardennes", code: "08", region: "Grand Est", prefecture: "Charleville-Mézières" },
    "dep_09": { nom: "Ariège", code: "09", region: "Occitanie", prefecture: "Foix" },
    "dep_10": { nom: "Aube", code: "10", region: "Grand Est", prefecture: "Troyes" },
    "dep_11": { nom: "Aude", code: "11", region: "Occitanie", prefecture: "Carcassonne" },
    "dep_12": { nom: "Aveyron", code: "12", region: "Occitanie", prefecture: "Rodez" },
    "dep_13": { nom: "Bouches-du-Rhône", code: "13", region: "Provence-Alpes-Côte d'Azur", prefecture: "Marseille" },
    "dep_14": { nom: "Calvados", code: "14", region: "Normandie", prefecture: "Caen" },
    "dep_15": { nom: "Cantal", code: "15", region: "Auvergne-Rhône-Alpes", prefecture: "Aurillac" },
    "dep_16": { nom: "Charente", code: "16", region: "Nouvelle-Aquitaine", prefecture: "Angoulême" },
    "dep_17": { nom: "Charente-Maritime", code: "17", region: "Nouvelle-Aquitaine", prefecture: "La Rochelle" },
    "dep_18": { nom: "Cher", code: "18", region: "Centre-Val de Loire", prefecture: "Bourges" },
    "dep_19": { nom: "Corrèze", code: "19", region: "Nouvelle-Aquitaine", prefecture: "Tulle" },
    "dep_2a": { nom: "Corse-du-Sud", code: "2A", region: "Corse", prefecture: "Ajaccio" },
    "dep_2b": { nom: "Haute-Corse", code: "2B", region: "Corse", prefecture: "Bastia" },
    "dep_21": { nom: "Côte-d'Or", code: "21", region: "Bourgogne-Franche-Comté", prefecture: "Dijon" },
    "dep_22": { nom: "Côtes-d'Armor", code: "22", region: "Bretagne", prefecture: "Saint-Brieuc" },
    "dep_23": { nom: "Creuse", code: "23", region: "Nouvelle-Aquitaine", prefecture: "Guéret" },
    "dep_24": { nom: "Dordogne", code: "24", region: "Nouvelle-Aquitaine", prefecture: "Périgueux" },
    "dep_25": { nom: "Doubs", code: "25", region: "Bourgogne-Franche-Comté", prefecture: "Besançon" },
    "dep_26": { nom: "Drôme", code: "26", region: "Auvergne-Rhône-Alpes", prefecture: "Valence" },
    "dep_27": { nom: "Eure", code: "27", region: "Normandie", prefecture: "Évreux" },
    "dep_28": { nom: "Eure-et-Loir", code: "28", region: "Centre-Val de Loire", prefecture: "Chartres" },
    "dep_29": { nom: "Finistère", code: "29", region: "Bretagne", prefecture: "Quimper" },
    "dep_30": { nom: "Gard", code: "30", region: "Occitanie", prefecture: "Nîmes" },
    "dep_31": { nom: "Haute-Garonne", code: "31", region: "Occitanie", prefecture: "Toulouse" },
    "dep_32": { nom: "Gers", code: "32", region: "Occitanie", prefecture: "Auch" },
    "dep_33": { nom: "Gironde", code: "33", region: "Nouvelle-Aquitaine", prefecture: "Bordeaux" },
    "dep_34": { nom: "Hérault", code: "34", region: "Occitanie", prefecture: "Montpellier" },
    "dep_35": { nom: "Ille-et-Vilaine", code: "35", region: "Bretagne", prefecture: "Rennes" },
    "dep_36": { nom: "Indre", code: "36", region: "Centre-Val de Loire", prefecture: "Châteauroux" },
    "dep_37": { nom: "Indre-et-Loire", code: "37", region: "Centre-Val de Loire", prefecture: "Tours" },
    "dep_38": { nom: "Isère", code: "38", region: "Auvergne-Rhône-Alpes", prefecture: "Grenoble" },
    "dep_39": { nom: "Jura", code: "39", region: "Bourgogne-Franche-Comté", prefecture: "Lons-le-Saunier" },
    "dep_40": { nom: "Landes", code: "40", region: "Nouvelle-Aquitaine", prefecture: "Mont-de-Marsan" },
    "dep_41": { nom: "Loir-et-Cher", code: "41", region: "Centre-Val de Loire", prefecture: "Blois" },
    "dep_42": { nom: "Loire", code: "42", region: "Auvergne-Rhône-Alpes", prefecture: "Saint-Étienne" },
    "dep_43": { nom: "Haute-Loire", code: "43", region: "Auvergne-Rhône-Alpes", prefecture: "Le Puy-en-Velay" },
    "dep_44": { nom: "Loire-Atlantique", code: "44", region: "Pays de la Loire", prefecture: "Nantes" },
    "dep_45": { nom: "Loiret", code: "45", region: "Centre-Val de Loire", prefecture: "Orléans" },
    "dep_46": { nom: "Lot", code: "46", region: "Occitanie", prefecture: "Cahors" },
    "dep_47": { nom: "Lot-et-Garonne", code: "47", region: "Nouvelle-Aquitaine", prefecture: "Agen" },
    "dep_48": { nom: "Lozère", code: "48", region: "Occitanie", prefecture: "Mende" },
    "dep_49": { nom: "Maine-et-Loire", code: "49", region: "Pays de la Loire", prefecture: "Angers" },
    "dep_50": { nom: "Manche", code: "50", region: "Normandie", prefecture: "Saint-Lô" },
    "dep_51": { nom: "Marne", code: "51", region: "Grand Est", prefecture: "Châlons-en-Champagne" },
    "dep_52": { nom: "Haute-Marne", code: "52", region: "Grand Est", prefecture: "Chaumont" },
    "dep_53": { nom: "Mayenne", code: "53", region: "Pays de la Loire", prefecture: "Laval" },
    "dep_54": { nom: "Meurthe-et-Moselle", code: "54", region: "Grand Est", prefecture: "Nancy" },
    "dep_55": { nom: "Meuse", code: "55", region: "Grand Est", prefecture: "Bar-le-Duc" },
    "dep_56": { nom: "Morbihan", code: "56", region: "Bretagne", prefecture: "Vannes" },
    "dep_57": { nom: "Moselle", code: "57", region: "Grand Est", prefecture: "Metz" },
    "dep_58": { nom: "Nièvre", code: "58", region: "Bourgogne-Franche-Comté", prefecture: "Nevers" },
    "dep_59": { nom: "Nord", code: "59", region: "Hauts-de-France", prefecture: "Lille" },
    "dep_60": { nom: "Oise", code: "60", region: "Hauts-de-France", prefecture: "Beauvais" },
    "dep_61": { nom: "Orne", code: "61", region: "Normandie", prefecture: "Alençon" },
    "dep_62": { nom: "Pas-de-Calais", code: "62", region: "Hauts-de-France", prefecture: "Arras" },
    "dep_63": { nom: "Puy-de-Dôme", code: "63", region: "Auvergne-Rhône-Alpes", prefecture: "Clermont-Ferrand" },
    "dep_64": { nom: "Pyrénées-Atlantiques", code: "64", region: "Nouvelle-Aquitaine", prefecture: "Pau" },
    "dep_65": { nom: "Hautes-Pyrénées", code: "65", region: "Occitanie", prefecture: "Tarbes" },
    "dep_66": { nom: "Pyrénées-Orientales", code: "66", region: "Occitanie", prefecture: "Perpignan" },
    "dep_67": { nom: "Bas-Rhin", code: "67", region: "Grand Est", prefecture: "Strasbourg" },
    "dep_68": { nom: "Haut-Rhin", code: "68", region: "Grand Est", prefecture: "Colmar" },
    "dep_69": { nom: "Rhône", code: "69", region: "Auvergne-Rhône-Alpes", prefecture: "Lyon" },
    "dep_70": { nom: "Haute-Saône", code: "70", region: "Bourgogne-Franche-Comté", prefecture: "Vesoul" },
    "dep_71": { nom: "Saône-et-Loire", code: "71", region: "Bourgogne-Franche-Comté", prefecture: "Mâcon" },
    "dep_72": { nom: "Sarthe", code: "72", region: "Pays de la Loire", prefecture: "Le Mans" },
    "dep_73": { nom: "Savoie", code: "73", region: "Auvergne-Rhône-Alpes", prefecture: "Chambéry" },
    "dep_74": { nom: "Haute-Savoie", code: "74", region: "Auvergne-Rhône-Alpes", prefecture: "Annecy" },
    "dep_75": { nom: "Paris", code: "75", region: "Île-de-France", prefecture: "Paris" },
    "dep_76": { nom: "Seine-Maritime", code: "76", region: "Normandie", prefecture: "Rouen" },
    "dep_77": { nom: "Seine-et-Marne", code: "77", region: "Île-de-France", prefecture: "Melun" },
    "dep_78": { nom: "Yvelines", code: "78", region: "Île-de-France", prefecture: "Versailles" },
    "dep_79": { nom: "Deux-Sèvres", code: "79", region: "Nouvelle-Aquitaine", prefecture: "Niort" },
    "dep_80": { nom: "Somme", code: "80", region: "Hauts-de-France", prefecture: "Amiens" },
    "dep_81": { nom: "Tarn", code: "81", region: "Occitanie", prefecture: "Albi" },
    "dep_82": { nom: "Tarn-et-Garonne", code: "82", region: "Occitanie", prefecture: "Montauban" },
    "dep_83": { nom: "Var", code: "83", region: "Provence-Alpes-Côte d'Azur", prefecture: "Toulon" },
    "dep_84": { nom: "Vaucluse", code: "84", region: "Provence-Alpes-Côte d'Azur", prefecture: "Avignon" },
    "dep_85": { nom: "Vendée", code: "85", region: "Pays de la Loire", prefecture: "La Roche-sur-Yon" },
    "dep_86": { nom: "Vienne", code: "86", region: "Nouvelle-Aquitaine", prefecture: "Poitiers" },
    "dep_87": { nom: "Haute-Vienne", code: "87", region: "Nouvelle-Aquitaine", prefecture: "Limoges" },
    "dep_88": { nom: "Vosges", code: "88", region: "Grand Est", prefecture: "Épinal" },
    "dep_89": { nom: "Yonne", code: "89", region: "Bourgogne-Franche-Comté", prefecture: "Auxerre" },
    "dep_90": { nom: "Territoire de Belfort", code: "90", region: "Bourgogne-Franche-Comté", prefecture: "Belfort" },
    "dep_91": { nom: "Essonne", code: "91", region: "Île-de-France", prefecture: "Évry" },
    "dep_92": { nom: "Hauts-de-Seine", code: "92", region: "Île-de-France", prefecture: "Nanterre" },
    "dep_93": { nom: "Seine-Saint-Denis", code: "93", region: "Île-de-France", prefecture: "Bobigny" },
    "dep_94": { nom: "Val-de-Marne", code: "94", region: "Île-de-France", prefecture: "Créteil" },
    "dep_95": { nom: "Val-d'Oise", code: "95", region: "Île-de-France", prefecture: "Cergy" }
  };
  
  // Les régions françaises
  const regions = {
    "Auvergne-Rhône-Alpes": ["01", "03", "07", "15", "26", "38", "42", "43", "63", "69", "73", "74"],
    "Bourgogne-Franche-Comté": ["21", "25", "39", "58", "70", "71", "89", "90"],
    "Bretagne": ["22", "29", "35", "56"],
    "Centre-Val de Loire": ["18", "28", "36", "37", "41", "45"],
    "Corse": ["2A", "2B"],
    "Grand Est": ["08", "10", "51", "52", "54", "55", "57", "67", "68", "88"],
    "Hauts-de-France": ["02", "59", "60", "62", "80"],
    "Île-de-France": ["75", "77", "78", "91", "92", "93", "94", "95"],
    "Normandie": ["14", "27", "50", "61", "76"],
    "Nouvelle-Aquitaine": ["16", "17", "19", "23", "24", "33", "40", "47", "64", "79", "86", "87"],
    "Occitanie": ["09", "11", "12", "30", "31", "32", "34", "46", "48", "65", "66", "81", "82"],
    "Pays de la Loire": ["44", "49", "53", "72", "85"],
    "Provence-Alpes-Côte d'Azur": ["04", "05", "06", "13", "83", "84"]
  };
  
  // Principales villes
  const villes = [
    { nom: "Paris", region: "Île-de-France", population: "2,161,000" },
    { nom: "Marseille", region: "Provence-Alpes-Côte d'Azur", population: "870,018" },
    { nom: "Lyon", region: "Auvergne-Rhône-Alpes", population: "518,635" },
    { nom: "Toulouse", region: "Occitanie", population: "479,553" },
    { nom: "Nice", region: "Provence-Alpes-Côte d'Azur", population: "342,637" },
    { nom: "Nantes", region: "Pays de la Loire", population: "309,346" },
    { nom: "Strasbourg", region: "Grand Est", population: "281,116" },
    { nom: "Montpellier", region: "Occitanie", population: "285,121" },
    { nom: "Bordeaux", region: "Nouvelle-Aquitaine", population: "254,436" },
    { nom: "Lille", region: "Hauts-de-France", population: "232,440" }
  ];
  
  // Fleuves et rivières principales
  const fleuves = [
    { nom: "Loire", longueur: 1012, embouchure: "Océan Atlantique", villes: "Orléans, Tours, Nantes" },
    { nom: "Seine", longueur: 777, embouchure: "Manche", villes: "Paris, Rouen, Le Havre" },
    { nom: "Rhône", longueur: 812, embouchure: "Méditerranée", villes: "Lyon, Avignon, Arles" },
    { nom: "Garonne", longueur: 647, embouchure: "Océan Atlantique", villes: "Toulouse, Bordeaux" },
    { nom: "Rhin", longueur: 1230, embouchure: "Mer du Nord", villes: "Strasbourg, Colmar" }
  ];
  
  // Massifs montagneux
  const montagnes = [
    { nom: "Alpes", sommet: "Mont Blanc", hauteur: 4809 },
    { nom: "Pyrénées", sommet: "Vignemale (en France)", hauteur: 3298 },
    { nom: "Massif Central", sommet: "Puy de Sancy", hauteur: 1886 },
    { nom: "Vosges", sommet: "Grand Ballon", hauteur: 1424 },
    { nom: "Jura", sommet: "Crêt de la Neige", hauteur: 1720 },
    { nom: "Massif armoricain", sommet: "Mont des Avaloirs", hauteur: 417 }
  ];

  const handleMapClick = (event) => {
    const id = event.target.id;
    if (id && id.startsWith('dep_')) {
      setHoveredDep(departements[id]);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Carte de France - Outil d'apprentissage</h1>
      
      <div className="flex space-x-2 mb-4">
        <button 
          className={`px-3 py-1 rounded ${activeTab === 'carte' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('carte')}
        >
          Carte
        </button>
        <button 
          className={`px-3 py-1 rounded ${activeTab === 'regions' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('regions')}
        >
          Régions
        </button>
        <button 
          className={`px-3 py-1 rounded ${activeTab === 'villes' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('villes')}
        >
          Villes
        </button>
        <button 
          className={`px-3 py-1 rounded ${activeTab === 'fleuves' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('fleuves')}
        >
          Fleuves
        </button>
        <button 
          className={`px-3 py-1 rounded ${activeTab === 'montagnes' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('montagnes')}
        >
          Montagnes
        </button>
      </div>
      
      {activeTab === 'carte' && (
        <div>
          <p className="mb-4">Cliquez sur un département pour voir ses détails.</p>
          <div className="mb-4">
            {svgContent && (
              <div 
                className="border border-gray-300 rounded p-2 bg-gray-50"
                dangerouslySetInnerHTML={{ __html: svgContent.replace(/<svg width="907" height="1000"/, '<svg width="650" height="600" viewBox="0 0 907 1000"') }} 
                onClick={handleMapClick}
              />
            )}
          </div>
          
          {hoveredDep && (
            <div className="bg-white rounded shadow-md p-4 border border-gray-300 mb-4">
              <h3 className="text-lg font-bold">{hoveredDep.nom} ({hoveredDep.code})</h3>
              <p><strong>Région :</strong> {hoveredDep.region}</p>
              <p><strong>Préfecture :</strong> {hoveredDep.prefecture}</p>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'regions' && (
        <div>
          <h2 className="text-xl font-bold mb-2">Les 13 régions métropolitaines</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.keys(regions).map(region => (
              <div key={region} className="bg-white shadow rounded p-3 border border-gray-300">
                <h3 className="font-bold">{region}</h3>
                <p><strong>Départements :</strong> {regions[region].join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {activeTab === 'villes' && (
        <div>
          <h2 className="text-xl font-bold mb-2">Les principales villes françaises</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border">Ville</th>
                  <th className="py-2 px-4 border">Région</th>
                  <th className="py-2 px-4 border">Population</th>
                </tr>
              </thead>
              <tbody>
                {villes.map((ville, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-4 border font-medium">{ville.nom}</td>
                    <td className="py-2 px-4 border">{ville.region}</td>
                    <td className="py-2 px-4 border">{ville.population}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab === 'fleuves' && (
        <div>
          <h2 className="text-xl font-bold mb-2">Les principaux fleuves</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border">Fleuve</th>
                  <th className="py-2 px-4 border">Longueur (km)</th>
                  <th className="py-2 px-4 border">Embouchure</th>
                  <th className="py-2 px-4 border">Villes traversées</th>
                </tr>
              </thead>
              <tbody>
                {fleuves.map((fleuve, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-4 border font-medium">{fleuve.nom}</td>
                    <td className="py-2 px-4 border">{fleuve.longueur}</td>
                    <td className="py-2 px-4 border">{fleuve.embouchure}</td>
                    <td className="py-2 px-4 border">{fleuve.villes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {activeTab === 'montagnes' && (
        <div>
          <h2 className="text-xl font-bold mb-2">Les massifs montagneux</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 border">Massif</th>
                  <th className="py-2 px-4 border">Point culminant</th>
                  <th className="py-2 px-4 border">Altitude (m)</th>
                </tr>
              </thead>
              <tbody>
                {montagnes.map((montagne, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-4 border font-medium">{montagne.nom}</td>
                    <td className="py-2 px-4 border">{montagne.sommet}</td>
                    <td className="py-2 px-4 border">{montagne.hauteur}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h3 className="font-bold text-lg mb-2">Méthodologie d'apprentissage</h3>
        <p className="mb-2">Pour mémoriser efficacement la géographie française :</p>
        <ol className="list-decimal pl-6">
          <li className="mb-1">Commencez par apprendre les 13 régions et leur position</li>
          <li className="mb-1">Pour chaque région, mémorisez ses départements et leurs numéros</li>
          <li className="mb-1">Associez les préfectures à leurs départements</li>
          <li className="mb-1">Situez les principales villes</li>
          <li className="mb-1">Terminez par les éléments naturels (fleuves, montagnes)</li>
        </ol>
        <p className="mt-2">Astuce : Les numéros des départements suivent généralement l'ordre alphabétique (avec des exceptions).</p>
      </div>
    </div>
  );
};

export default CarteFranceSimple;