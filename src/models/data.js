// Emergency types data
const emergencyTypes = [
  { id: 8, title: "Acidente de Trânsito" },
  { id: 5, title: "Atendimento Pré-Hospitalar" },
  { id: 2, title: "Auxílios/Apoios" },
  { id: 10, title: "Averiguação/Corte de Árvore" },
  { id: 11, title: "Averiguação/Manejo de Inseto" },
  { id: 12, title: "Ação Preventiva Social" },
  { id: 9, title: "Ações Preventivas" },
  { id: 7, title: "Diversos" },
  { id: 1, title: "Incêndio" },
  { id: 3, title: "Produtos Perigosos" },
  { id: 13, title: "Risco Potencial" },
  { id: 4, title: "Salvamento/Busca/Resgate" }
];

// Cities data (starting with VIDEIRA from the sample data)
const cities = [
  { id_cidade: 8379, nome_cidade: "VIDEIRA" },
  { id_cidade: 8177, nome_cidade: "JOAÇABA" }
];

// API request data structure
const apiRequestData = {
  "user": {
    "cidade": [
      8031,
      8107,
      8131,
      9229,
      8177,
      8255,
      8303,
      8353,
      8379
    ]
  },
  "emergencies": emergencyTypes.map(type => ({
    ...type,
    choosed: 1
  }))
};

module.exports = {
  emergencyTypes,
  cities,
  apiRequestData
}; 