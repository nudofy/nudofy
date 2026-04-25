const { icons } = require('lucide-react-native');
const names = ['CheckCircle','CheckCircle2','BarChart3','Home','Check','CircleCheck','CircleCheckBig','ChartBar','ChartBarBig','ChartColumn','ChartColumnBig','House'];
for (const n of names) console.log(n + ':', Boolean(icons[n]));
