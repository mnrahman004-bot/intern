import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sales, products } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build a summary of sales data for the AI prompt
    const productSummaries = products.map((product: any) => {
      const productSales = sales.filter((s: any) => s.product_id === product.id);
      const totalSold = productSales.reduce((sum: number, s: any) => sum + s.quantity, 0);

      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

      const recentQty = productSales
        .filter((s: any) => new Date(s.sale_date).getTime() > oneWeekAgo)
        .reduce((sum: number, s: any) => sum + s.quantity, 0);
      const priorQty = productSales
        .filter((s: any) => {
          const t = new Date(s.sale_date).getTime();
          return t > twoWeeksAgo && t <= oneWeekAgo;
        })
        .reduce((sum: number, s: any) => sum + s.quantity, 0);

      return {
        name: product.name,
        current_stock: product.quantity,
        low_stock_threshold: product.low_stock_threshold,
        total_sold_30d: totalSold,
        sold_last_7d: recentQty,
        sold_prior_7d: priorQty,
        sale_count: productSales.length,
      };
    });

    const systemPrompt = `You are an inventory demand forecasting AI that uses a Random Forest ensemble approach. For each product, simulate multiple independent "decision trees" that each analyze different feature subsets:

Tree 1 - Trend Analysis: Focus on week-over-week sales velocity changes (sold_last_7d vs sold_prior_7d).
Tree 2 - Stock Pressure: Analyze current_stock relative to low_stock_threshold and recent burn rate.
Tree 3 - Volume Pattern: Use total_sold_30d and sale_count to detect consistent vs bursty demand.
Tree 4 - Seasonality Heuristic: Consider the current time of year/month and any cyclic patterns implied by the data distribution.
Tree 5 - Safety Stock Model: Apply a service-level factor (95%) to the demand variance.

Aggregate predictions across all trees using majority voting for risk_level and averaged estimates for demand/reorder quantities. Explain which trees contributed most to each prediction. Return results using the provided tool.`;

    const userPrompt = `Using the Random Forest ensemble method described above, analyze the following 30-day inventory and sales data and predict demand for the next 7 days.

Product data:
${JSON.stringify(productSummaries, null, 2)}

For each product, run all 5 decision trees and aggregate:
1. predicted_demand: averaged estimate across trees for units needed in the next 7 days
2. reorder_quantity: how many units to reorder (consider current stock, predicted demand, and a 2-week safety buffer)
3. risk_level: majority vote across trees — "high" if stock is at or below threshold, "medium" if within 2x threshold, "low" otherwise
4. reasoning: explain which decision trees were most influential and their individual signals`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_predictions",
              description: "Return demand predictions for all products",
              parameters: {
                type: "object",
                properties: {
                  predictions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        product_name: { type: "string" },
                        current_stock: { type: "number" },
                        predicted_demand: { type: "number" },
                        reorder_quantity: { type: "number" },
                        risk_level: { type: "string", enum: ["low", "medium", "high"] },
                        reasoning: { type: "string" },
                      },
                      required: ["product_name", "current_stock", "predicted_demand", "reorder_quantity", "risk_level"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["predictions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_predictions" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in your workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error(`AI gateway returned ${response.status}`);
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("No tool call returned from AI");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ predictions: parsed.predictions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Prediction error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
