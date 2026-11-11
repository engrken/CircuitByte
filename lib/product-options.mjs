// Canonical options for catalog products sold in more than one listed value/type.
// These values are validated at checkout and saved onto the order item.
export const productOptions = {
  'cb-001': { label: 'Diode type', options: ['1N4007', '1N4148', '1N5399', '1N5819', '1N5822', '1N5408', 'FR107', 'FR207'] },
  'cb-002': { label: 'Resistance', options: ['1Ω', '10Ω', '20Ω', '33Ω', '47Ω', '51Ω', '68Ω', '75Ω', '82Ω', '91Ω', '100Ω', '200Ω', '220Ω', '330Ω', '470Ω', '510Ω', '680Ω', '750Ω', '820Ω', '910Ω', '1KΩ', '10KΩ', '20KΩ', '33KΩ', '47KΩ', '51KΩ', '68KΩ', '75KΩ', '82KΩ', '91KΩ', '100KΩ', '200KΩ', '220KΩ', '330KΩ', '470KΩ', '510KΩ', '680KΩ', '750KΩ', '820KΩ', '910KΩ', '1MΩ'] },
  'cb-003': { label: 'Capacitor value', options: ['2P', '3P', '5P', '10P', '15P', '22P', '30P', '33P', '47P', '68P', '75P', '82P', '101', '151', '221', '331', '471', '681', '102', '152', '222', '332', '472', '682', '103', '153', '223', '473', '683', '104', '154', '224', '334', '474', '684', '105', '225', '475', '106'] },
  'cb-004': { label: 'Electrolytic capacitor value', options: ['50V 0.22uF', '50V 0.47uF', '50V 1uF', '50V 2.2uF', '50V 4.7uF', '25V 10uF', '16V 22uF', '16V 33uF', '16V 47uF', '16V 220uF', '16V 100uF', '16V 470uF'] },
  'cb-005': { label: 'Transistor type', options: ['59012', '59013', '59014', '59015', '59018', 'A1015', 'C1815', 'S8050', 'S8550', 'A42', '2N5401', '2N5551', 'A733', 'C945', '2N3906', '2N3904', '2N2222', '2N2907', 'A92', 'BC547', 'BC548', 'BC557', 'BC550', 'BC560', 'BC337', 'BC327'] },
  'cb-006': { label: 'Power transistor type', options: ['TIP41C', 'TIP42C'] },
  'cb-009': { label: 'LED size and color', options: ['3mm Red', '3mm Yellow', '3mm Blue', '3mm White', '3mm Green', '5mm Red', '5mm Yellow', '5mm Blue', '5mm White', '5mm Green'] },
  'cb-010': { label: '3296 potentiometer value', options: ['101 (100Ω)', '201 (200Ω)', '501 (500Ω)', '102 (1KΩ)', '202 (2KΩ)', '502 (5KΩ)', '103 (10KΩ)', '203 (20KΩ)', '503 (50KΩ)', '104 (100KΩ)', '204 (200KΩ)', '504 (500KΩ)', '105 (1MΩ)'] },
  'cb-011': { label: 'RM063 resistance value', options: ['101 (100Ω)', '201 (200Ω)', '501 (500Ω)', '102 (1KΩ)', '202 (2KΩ)', '502 (5KΩ)', '103 (10KΩ)', '203 (20KΩ)', '503 (50KΩ)', '104 (100KΩ)', '204 (200KΩ)', '504 (500KΩ)', '105 (1MΩ)'] },
  'cb-012': { label: 'Potentiometer value', options: ['5KΩ', '10KΩ', '20KΩ', '50KΩ', '100KΩ'] },
  'cb-013': { label: 'Voltage regulator type', options: ['L7805', 'L7809', 'L7812', 'L7815', 'L7905', 'L7912', 'LM317'] },
  'cb-014': { label: 'PCB size', options: ['2cm × 8cm', '3cm × 7cm', '4cm × 6cm', '5cm × 7cm', '7cm × 9cm'] },
  'cb-066': { label: 'LCD backlight color', options: ['Green', 'Blue'] },
  'cb-070': { label: 'Servo rotation', options: ['180°', '360°'] },
  'cb-071': { label: 'Servo rotation', options: ['180°', '360°'] },
  'cb-076': { label: 'Dupont connector type', options: ['M-F', 'M-M', 'F-F'], wireLengthsCm: [10, 20, 30] }
};
