import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../lib/api";
import * as d3 from "d3";

const STEP_DURATION = 750;
const BAR_HEIGHT = 22;
const MARGIN = { top: 80, right: 150, bottom: 50, left: 180 };

export default function LeagueProgressionPage() {
    const navigate = useNavigate();
    const params = useParams<{ league_id?: string }>();
    const [sp] = useSearchParams();
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [raceKey, setRaceKey] = useState(0);

    const leagueId = Number(params.league_id ?? sp.get("league_id") ?? "");

    const { data, isLoading } = useQuery({
        queryKey: ["league-progression", leagueId],
        queryFn: async () => (await api.get(`/v1/league-progression/${leagueId}/`)).data,
        enabled: !!leagueId,
    });

    const prepared = useMemo(() => {
        if (!data?.frames?.length) return null;
        const frames = [...data.frames].sort((a, b) => a.gameweek - b.gameweek);
        const playerNames = Array.from(new Set(frames.flatMap(f => f.standings.map(s => s.player_name))));
        const customColors = [...d3.schemeTableau10, ...d3.schemeSet3, ...d3.schemePaired, ...d3.schemeDark2];

        return {
            frames,
            apiCount: frames[0].standings.length,
            leagueName: data.league_name,
            colorScale: d3.scaleOrdinal(customColors).domain(playerNames)
        };
    }, [data]);

    useEffect(() => {
        if (!prepared || !containerRef.current) return;

        const style = getComputedStyle(document.body);
        const bodyFont = style.fontFamily;
        const textColor = style.getPropertyValue('--text').trim() || '#000';
        const bgColor = style.getPropertyValue('--bg').trim() || '#fff';

        const { frames, apiCount, colorScale, leagueName } = prepared;
        const container = containerRef.current;
        container.innerHTML = "";

        const width = Math.max(1600, container.clientWidth);
        const height = MARGIN.top + MARGIN.bottom + (BAR_HEIGHT * apiCount);
        const chartWidth = width - MARGIN.left - MARGIN.right;

        const svg = d3.select(container).append("svg")
            .attr("width", width).attr("height", height)
            .attr("viewBox", `0 0 ${width} ${height}`)
            .style("background", bgColor)
            .style("font-family", bodyFont)
            .style("overflow", "visible");

        svg.append("text")
            .attr("x", MARGIN.left)
            .attr("y", 40)
            .attr("fill", textColor)
            .style("font-size", "24px")
            .style("font-weight", "700")
            .text(leagueName);

        const g = svg.append("g").attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);
        const axisG = g.append("g");
        const barG = g.append("g");

        const gwLabel = svg.append("text")
            .attr("text-anchor", "end").attr("x", width - 20).attr("y", height - 20)
            .attr("font-size", "100px").attr("font-weight", "900")
            .attr("fill", textColor).attr("opacity", 0.05);

        const x = d3.scaleLinear().range([0, chartWidth]);
        const y = d3.scaleBand().domain(d3.range(apiCount).map(String)).range([0, apiCount * BAR_HEIGHT]).padding(0.15);

        const roundedRightRect = (w: number, h: number, r: number) => {
            const radius = Math.min(r, w / 2, h / 2);
            return `M0,0 h${Math.max(0, w - radius)} a${radius},${radius} 0 0 1 ${radius},${radius} v${Math.max(0, h - 2 * radius)} a${radius},${radius} 0 0 1 -${radius},${radius} h${-Math.max(0, w - radius)} z`;
        };

        let mediaRecorder: MediaRecorder | null = null;
        let chunks: Blob[] = [];
        const canvas = document.createElement("canvas");
        const pixelRatio = 2;
        canvas.width = width * pixelRatio;
        canvas.height = height * pixelRatio;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.scale(pixelRatio, pixelRatio);

        if (isRecording && ctx) {
            const stream = canvas.captureStream(60);
            mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9', videoBitsPerSecond: 8000000 });
            mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${leagueName}_Final_Race.webm`;
                a.click();
                setIsRecording(false);
            };
            mediaRecorder.start();
        }

        const syncFrame = () => {
            if (!isRecording || !ctx) return;
            const svgNode = container.querySelector("svg");
            if (!svgNode) return;
            const svgData = new XMLSerializer().serializeToString(svgNode);
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
            };
            img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
        };

        let gwIdx = 0;
        let isStopped = false;

        function update() {
            if (isStopped || gwIdx >= frames.length) {
                if (mediaRecorder?.state === "recording") setTimeout(() => mediaRecorder.stop(), 2000);
                return;
            }

            // --- DRAMATIC SLOWDOWN LOGIC ---
            const totalFrames = frames.length;
            const remaining = totalFrames - gwIdx;
            let currentDuration = STEP_DURATION;
            let currentEase = d3.easeLinear;

            if (remaining <= 3) {
                // Gradually increase duration for the last 3 weeks
                // Week -3: 1.5s, Week -2: 2.2s, Week -1: 3.5s
                const slowdownFactor = remaining === 3 ? 1.1 : remaining === 2 ? 1.2 : 1.5;
                currentDuration = STEP_DURATION * slowdownFactor;
                currentEase = d3.easeCubicInOut; // Smoother finish
            }

            const frame = frames[gwIdx];
            const sortedData = [...frame.standings].sort((a, b) => b.total - a.total).map((d, i) => ({ ...d, currentRank: i }));
            const visibleData = sortedData.filter(d => d.currentRank < apiCount);

            x.domain([0, d3.max(sortedData, d => d.total) * 1.1 || 1]);
            gwLabel.text(`GW ${frame.gameweek}`);

            const t = d3.transition().duration(currentDuration).ease(currentEase);
            if (isRecording) { const timer = d3.timer(syncFrame); t.on("end.timer", () => timer.stop()); }

            axisG.transition(t).call(d3.axisTop(x).ticks(width / 150).tickSize(-apiCount * BAR_HEIGHT))
                .call(g => {
                    g.select(".domain").remove();
                    g.selectAll("text").attr("fill", textColor).style("font-family", "inherit");
                });

            const bars = barG.selectAll<SVGGElement, any>("g.bar-row").data(visibleData, d => d.player_name);
            const enter = bars.enter().append("g").attr("class", "bar-row").attr("transform", d => `translate(0, ${y(String(d.currentRank))})`);

            enter.append("path").attr("fill", d => colorScale(d.player_name) as string);
            enter.append("text").attr("class", "name-label").attr("x", -12).attr("y", y.bandwidth() / 2).attr("text-anchor", "end").attr("dominant-baseline", "middle").attr("fill", textColor).style("font-weight", "600").text(d => d.player_name);
            enter.append("text").attr("class", "val-label").attr("y", y.bandwidth() / 2).attr("dominant-baseline", "middle").attr("fill", textColor).style("font-weight", "700").text(0);

            const merge = bars.merge(enter as any);
            merge.transition(t).attr("transform", d => `translate(0, ${y(String(d.currentRank))})`);
            merge.select("path").transition(t).attrTween("d", function(d) {
                const prev = (this as any)._w || 0; const curr = x(d.total); (this as any)._w = curr;
                return (t: number) => roundedRightRect(d3.interpolate(prev, curr)(t), y.bandwidth(), 8);
            });
            merge.select("text.val-label").transition(t).attr("x", d => x(d.total) + 12).tween("text", function(d) {
                const i = d3.interpolateNumber(parseInt(this.textContent || "0"), d.total);
                return (t: number) => { this.textContent = Math.round(i(t)).toString(); };
            });

            bars.exit().transition(t).style("opacity", 0).remove();
            gwIdx++;
            t.on("end", update);
        }

        update();
        return () => { isStopped = true; };
    }, [prepared, raceKey, isRecording]);

    if (isLoading) return <main className="page--compact"><div className="page-toolbar"><h1 className="page-title">Loading...</h1></div></main>;

    return (
        <main className="page--compact">
            <div className="page-toolbar">
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', width: '100%' }}>
                    <button
                        className="btn"
                        style={{ color: isRecording ? 'red' : 'inherit', fontWeight: 600 }}
                        onClick={() => { setIsRecording(true); setRaceKey(k => k + 1); }}
                        disabled={isRecording}
                    >
                        {isRecording ? '🔴 Recording...' : '⏺ Record for WhatsApp'}
                    </button>
                    <button className="btn" onClick={() => navigate(-1)}>Back</button>
                </div>
            </div>
            <div className="table-wrap">
                <div ref={containerRef} key={raceKey} style={{ width: "100%", overflowX: "auto", padding: "20px 0" }} />
            </div>
        </main>
    );
}