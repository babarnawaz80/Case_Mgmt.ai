import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const data = [
  { name: "On Track", value: 16.67, color: "hsl(150, 70%, 45%)" },
  { name: "Off Track", value: 0, color: "hsl(210, 80%, 55%)" },
  { name: "Out of Compliance", value: 83.33, color: "hsl(0, 72%, 55%)" },
];

export function PCPChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="glass rounded-xl p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display font-semibold text-foreground text-lg">PCP Compliance</h3>
          <p className="text-sm text-muted-foreground">Person-Centered Plan status</p>
        </div>
        <button className="text-sm text-primary hover:underline">View Details</button>
      </div>

      <div className="flex items-center gap-6">
        <div className="w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 18%, 10%)",
                  border: "1px solid hsl(220, 14%, 18%)",
                  borderRadius: "8px",
                  color: "hsl(210, 40%, 96%)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3 flex-1">
          {data.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-muted-foreground flex-1">{item.name}</span>
              <span className="text-sm font-semibold text-foreground">{item.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
