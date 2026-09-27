from datapass_app import StudioApp, NumberParameter, ViewSpec, TaskSpec, ArtifactBinding

app = (
    StudioApp(
        id="signal-demo",
        title="Signal Demo",
        description="Inert authoring example; execution remains in trusted source.",
    )
    .parameter(NumberParameter("gain", "Gain", 1.0, 0.2, 3.0, 0.05, "x"))
    .parameter(NumberParameter("damping", "Damping", 0.2, 0.0, 0.9, 0.01))
    .view(ViewSpec("lab", "Laboratory", "lab"))
    .view(ViewSpec("references", "References", "references"))
    .task(TaskSpec("evaluate", "Evaluate", ("parameter.gain", "parameter.damping"), ("metrics",)))
    .artifact(ArtifactBinding("output-figure", "Output figure", "figure", ("output",), source_kind="synthetic"))
)

print(app.dumps())
