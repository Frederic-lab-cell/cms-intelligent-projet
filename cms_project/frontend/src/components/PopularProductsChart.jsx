import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";

export default function PopularProductsChart({ data }) {
  // Transformation des données si nécessaire pour le graphique
  const chartData = data?.map(item => ({
    name: item.name.length > 15 ? item.name.substring(0, 12) + "..." : item.name,
    sales: item.sales,
    score: item.rl_score
  })) || [];

  return (
    <div className="h-64 w-full bg-slate-950/70 border border-slate-800 rounded-3xl p-4">
      <h3 className="text-sm text-gray-300 mb-4">Top Performance RL</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 20 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#1e293b" />
          <XAxis type="number" hide />
          <YAxis 
            dataKey="name" 
            type="category" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 10 }} 
          />
          <Tooltip 
            cursor={{ fill: '#1e293b', opacity: 0.4 }}
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', color: '#fff' }}
          />
          <Bar dataKey="sales" radius={[0, 4, 4, 0]} barSize={20}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#059669'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}