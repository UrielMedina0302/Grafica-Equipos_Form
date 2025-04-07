import React, { useLayoutEffect, useRef, useState } from "react";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";
import io from "socket.io-client";

const socket = io("http://10.10.62.12:4000");

export default function Grafica() {
  const chartRef = useRef(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [resetModalAbierto, setResetModalAbierto] = useState(false);
  const [proyectos, setProyectos] = useState([]);
  const [formData, setFormData] = useState({
    proyectoIndex: 0,
    puntosAAgregar: 0
  });
  const [proyectoAResetear, setProyectoAResetear] = useState(0);
  const [error, setError] = useState("");

  // Configuración de límites
  const PUNTAJE_MINIMO = 0;
  const PUNTAJE_MAXIMO = 40;

  useLayoutEffect(() => {
    const root = am5.Root.new(chartRef.current);
    root.setThemes([am5themes_Animated.new(root)]);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: "none",
        wheelY: "none",
        paddingLeft: 20,
        paddingRight: 20,
        paddingTop: 20,
        paddingBottom: 30,
        background: am5.Rectangle.new(root, {
          fill: am5.color(0xf3f6f4),
          fillOpacity: 1,
        }),
      })
    );

    const yRenderer = am5xy.AxisRendererY.new(root, {
      minorGridEnabled: true,
    });

    yRenderer.grid.template.set("visible", false);
    yRenderer.labels.template.setAll({
      fill: am5.color(0x5b5b5b),
      fontSize: 14,
    });

    const yAxis = chart.yAxes.push(
      am5xy.CategoryAxis.new(root, {
        categoryField: "name",
        renderer: yRenderer,
        paddingRight: 40,
        cellHeight: 50, 
      })
    );

    const xRenderer = am5xy.AxisRendererX.new(root, {
      minGridDistance: 60,
    });

    xRenderer.labels.template.setAll({
      fill: am5.color(0x1e1e1e),
      fontSize: 16,
      centerY: am5.p0,
      paddingTop: 10,
      oversizedBehavior: "none",
    });

    const xAxis = chart.xAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        max: 50,
        interval: 5,
        renderer: xRenderer,
      })
    );

    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: "Puntaje",
        xAxis: xAxis,
        yAxis: yAxis,
        valueXField: "puntaje",
        categoryYField: "name",
        sequencedInterpolation: true,
        calculateAggregates: true,
        maskBullets: false,
        tooltip: am5.Tooltip.new(root, {
          dy: -30,
          pointerOrientation: "vertical",
          labelText: "{valueX}",
          getFillFromSprite: false,
          background: am5.Rectangle.new(root, {
            fill: am5.color(0x79142f),
            fillOpacity: 0.95,
          }),
          label: {
            fill: am5.color(0xffffff),
          },
        }),
      })
    );

    series.columns.template.setAll({
      strokeOpacity: 0,
      cornerRadiusBR: 25,
      cornerRadiusTR: 25,
      maxHeight: 50,
      fillOpacity: 0.9,
      tooltipText: "{valueX}",
    });

    const circleTemplate = am5.Template.new({});

    series.bullets.push(function (root, series, dataItem) {
      const bulletContainer = am5.Container.new(root, {});
      bulletContainer.children.push(
        am5.Circle.new(root, { radius: 35 }, circleTemplate)
      );

      const maskCircle = bulletContainer.children.push(
        am5.Circle.new(root, { radius: 30 })
      );

      const imageContainer = bulletContainer.children.push(
        am5.Container.new(root, {
          mask: maskCircle,
        })
      );

      imageContainer.children.push(
        am5.Picture.new(root, {
          templateField: "pictureSettings",
          centerX: am5.p50,
          centerY: am5.p50,
          width: 60,
          height: 60,
        })
      );

      return am5.Bullet.new(root, {
        locationX: 0,
        sprite: bulletContainer,
      });
    });

    series.set("heatRules", [
      {
        dataField: "valueX",
        min: am5.color(0xd5aebb),
        max: am5.color(0x79142f),
        target: series.columns.template,
        key: "fill",
      },
      {
        dataField: "valueX",
        min: am5.color(0xf4f5f4),
        max: am5.color(0x79142f),
        target: circleTemplate,
        key: "fill",
      },
    ]);

    let currentlyHovered;

    function handleOut() {
      if (currentlyHovered) {
        const bullet = currentlyHovered.bullets[0];
        bullet.animate({
          key: "locationX",
          to: 0,
          duration: 600,
          easing: am5.ease.out(am5.ease.cubic),
        });
        currentlyHovered = null;
      }
    }

    series.columns.template.events.on("pointerover", function (e) {
      const dataItem = e.target.dataItem;
      if (dataItem && currentlyHovered !== dataItem) {
        handleOut();
        currentlyHovered = dataItem;
        const bullet = dataItem.bullets[0];
        bullet.animate({
          key: "locationX",
          to: 1,
          duration: 600,
          easing: am5.ease.out(am5.ease.cubic),
        });
      }
    });

    series.columns.template.events.on("pointerout", function () {
      handleOut();
    });

    const updateChart = (data) => {
      setProyectos(data);
      series.data.setAll(data);
      yAxis.data.setAll(data);
    };

    socket.on("conexionInicial", updateChart);
    socket.on("puntajeActualizado", updateChart);

    return () => {
      root.dispose();
      socket.off("conexionInicial", updateChart);
      socket.off("puntajeActualizado", updateChart);
    };
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!proyectos[formData.proyectoIndex]) return;

    const nuevoPuntaje = proyectos[formData.proyectoIndex].puntaje + Number(formData.puntosAAgregar);
    
    // Validar límites
    if (nuevoPuntaje < PUNTAJE_MINIMO) {
      setError(`El puntaje no puede ser menor a ${PUNTAJE_MINIMO}`);
      return;
    }

    if (nuevoPuntaje > PUNTAJE_MAXIMO) {
      setError(`El puntaje no puede ser mayor a ${PUNTAJE_MAXIMO}`);
      return;
    }

    socket.emit("actualizarPuntaje", {
      index: formData.proyectoIndex,
      puntaje: nuevoPuntaje
    });

    setModalAbierto(false);
    setFormData({ proyectoIndex: 0, puntosAAgregar: 0 });
  };

  const handleResetPuntaje = (proyectoIndex) => {
    if (!proyectos[proyectoIndex]) return;
    
    if (window.confirm(`¿Estás seguro de reiniciar el puntaje de ${proyectos[proyectoIndex].name} a 0?`)) {
      socket.emit("reiniciarPuntaje", {
        index: proyectoIndex,
        puntaje: 0
      });
      setResetModalAbierto(false);
    }
  };

  const handleResetTodos = () => {
    if (window.confirm("¿Estás seguro de reiniciar TODOS los puntajes a 0?")) {
      socket.emit("reiniciarTodos");
    }
  };

  const calcularLimites = (proyectoIndex) => {
    if (!proyectos[proyectoIndex]) return { min: -100, max: 100 };
    
    const puntajeActual = proyectos[proyectoIndex].puntaje;
    return {
      min: PUNTAJE_MINIMO - puntajeActual,
      max: PUNTAJE_MAXIMO - puntajeActual
    };
  };

  const limites = calcularLimites(formData.proyectoIndex);

  const modalStyles = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000
  };

  const modalContentStyles = {
    backgroundColor: "white",
    padding: "30px",
    borderRadius: "10px",
    width: "400px",
    maxWidth: "90%",
    boxShadow: "0 5px 15px rgba(0,0,0,0.3)",
    position: "relative"
  };

  const closeButtonStyles = {
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "none",
    border: "none",
    fontSize: "20px",
    cursor: "pointer"
  };

  const buttonStyles = {
    flex: 1,
    color: "white",
    border: "none",
    padding: "12px",
    borderRadius: "5px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    marginTop: "10px"
  };

  return (
    <div style={{ background: "#f4f5f4", minHeight: "100vh", paddingTop: "2rem", position: "relative" }}>
      <h2
        style={{
          textAlign: "center",
          color: "#8b1e3b",
          fontSize: "28px",
          marginBottom: "1rem",
          fontWeight: "800",
          fontFamily: "Arial, sans-serif",
          letterSpacing: "0.5px",
          textTransform: "uppercase",
        }}
      >
        <span style={{ fontSize: "34px", fontWeight: "900", display: "block" }}>
          DEMOSTRACIÓN DE PROYECTOS INTEGRADORES
        </span>
        <span
          style={{
            color: "#404040",
            fontSize: "26px",
            fontWeight: "600",
            display: "block",
          }}
        >
          del Área de Tecnologías de la Información
        </span>
      </h2>

      <div style={{ position: "absolute", top: "20px", right: "5%", display: "flex", gap: "10px" }}>
        <button
          onClick={() => setResetModalAbierto(true)}
          style={{
            background: "#d32f2f",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            zIndex: 100
          }}
        >
          Reiniciar Puntaje
        </button>

        <button
          onClick={handleResetTodos}
          style={{
            background: "#ff0000",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            zIndex: 100
          }}
        >
          Reiniciar Todos
        </button>

        <button
          onClick={() => setModalAbierto(true)}
          style={{
            background: "#8b1e3b",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "5px",
            cursor: "pointer",
            fontSize: "16px",
            fontWeight: "bold",
            zIndex: 100
          }}
        >
          Asignar Puntaje
        </button>
      </div>

      {modalAbierto && (
        <div style={modalStyles}>
          <div style={modalContentStyles}>
            <button 
              onClick={() => {
                setModalAbierto(false);
                setError("");
              }}
              style={closeButtonStyles}
            >
              ×
            </button>
            
            <h2 style={{ color: "#8b1e3b", marginBottom: "20px" }}>Asignar Puntaje</h2>
            
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <label style={{ fontWeight: "bold" }}>Proyecto:</label>
              <select
                value={formData.proyectoIndex}
                onChange={(e) => {
                  const index = parseInt(e.target.value);
                  setFormData({...formData, proyectoIndex: index});
                }}
                style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}
              >
                {proyectos.map((proyecto, index) => (
                  <option key={index} value={index}>
                    {proyecto.name}
                  </option>
                ))}
              </select>
              
              <label style={{ fontWeight: "bold" }}>Puntos a agregar:</label>
              <input
                type="number"
                placeholder={`Entre ${limites.min} y ${limites.max}`}
                value={formData.puntosAAgregar}
                onChange={(e) => setFormData({...formData, puntosAAgregar: Number(e.target.value)})}
                min={limites.min}
                max={limites.max}
                style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}
                required
              />
              
              {error && (
                <div style={{ color: "#d32f2f", marginTop: "-10px", fontSize: "14px" }}>
                  {error}
                </div>
              )}
              
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  type="submit"
                  style={{
                    ...buttonStyles,
                    background: "#8b1e3b",
                  }}
                >
                  Aplicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {resetModalAbierto && (
        <div style={modalStyles}>
          <div style={modalContentStyles}>
            <button 
              onClick={() => setResetModalAbierto(false)}
              style={closeButtonStyles}
            >
              ×
            </button>
            
            <h2 style={{ color: "#d32f2f", marginBottom: "20px" }}>Reiniciar Puntaje</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <label style={{ fontWeight: "bold" }}>Seleccionar proyecto:</label>
              <select
                value={proyectoAResetear}
                onChange={(e) => setProyectoAResetear(parseInt(e.target.value))}
                style={{ padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}
              >
                {proyectos.map((proyecto, index) => (
                  <option key={index} value={index}>
                    {proyecto.name} (Actual: {proyecto.puntaje} pts)
                  </option>
                ))}
              </select>
              
              <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  onClick={() => handleResetPuntaje(proyectoAResetear)}
                  style={{
                    ...buttonStyles,
                    background: "#d32f2f",
                  }}
                >
                  Confirmar Reinicio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        id="chartdiv"
        ref={chartRef}
        style={{
          width: "90%",
          height: "820px",
          margin: "0 auto",
          background: "#404040",
          borderRadius: "20px",
          padding: "2rem",
          boxShadow: "0 10px 100px rgba(0, 0, 0, 0.1)",
          overflow: "hidden",
        }}
      ></div>
    </div>
  );
}