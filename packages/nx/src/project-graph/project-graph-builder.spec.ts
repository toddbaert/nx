import { ProjectGraphBuilder } from './project-graph-builder';

describe('ProjectGraphBuilder', () => {
  let builder: ProjectGraphBuilder;

  beforeEach(() => {
    builder = new ProjectGraphBuilder();
    builder.addNode({
      name: 'source',
      type: 'lib',
      data: {
        files: [
          {
            file: 'source/index.ts',
          },
          {
            file: 'source/second.ts',
          },
        ],
      } as any,
    });
    builder.addNode({
      name: 'target',
      type: 'lib',
      data: {} as any,
    });
  });

  it(`should add a dependency`, () => {
    expect(() =>
      builder.addImplicitDependency('invalid-source', 'target')
    ).toThrowError();
    expect(() =>
      builder.addImplicitDependency('source', 'invalid-target')
    ).toThrowError();
    // this should not break, but should not exist in resulting dependencies either
    builder.addStaticDependency('source', 'invalid-target', 'source/index.ts');

    // ignore the self deps
    builder.addDynamicDependency('source', 'source', 'source/index.ts');

    // don't include duplicates of the same type
    builder.addImplicitDependency('source', 'target');
    builder.addImplicitDependency('source', 'target');
    builder.addStaticDependency('source', 'target', 'source/index.ts');
    builder.addDynamicDependency('source', 'target', 'source/index.ts');
    builder.addStaticDependency('source', 'target', 'source/index.ts');

    const graph = builder.getUpdatedProjectGraph();
    expect(graph.dependencies).toEqual({
      source: [
        {
          source: 'source',
          target: 'target',
          type: 'implicit',
        },
        {
          source: 'source',
          target: 'target',
          type: 'static',
        },
        {
          source: 'source',
          target: 'target',
          type: 'dynamic',
        },
      ],
      target: [],
    });
  });

  it(`should add an implicit dependency`, () => {
    builder.addImplicitDependency('source', 'target');

    const graph = builder.getUpdatedProjectGraph();
    expect(graph.dependencies).toEqual({
      source: [
        {
          source: 'source',
          target: 'target',
          type: 'implicit',
        },
      ],
      target: [],
    });
  });

  it(`should add an explicit dependency`, () => {
    expect(() =>
      builder.addExplicitDependency(
        'invalid-source',
        'source/index.ts',
        'target'
      )
    ).toThrowError();
    expect(() =>
      builder.addExplicitDependency(
        'source',
        'source/invalid-index.ts',
        'target'
      )
    ).toThrowError();

    // ignore the self deps
    builder.addExplicitDependency('source', 'source/index.ts', 'source');

    // don't include duplicates
    builder.addExplicitDependency('source', 'source/index.ts', 'target');
    builder.addExplicitDependency('source', 'source/second.ts', 'target');

    const graph = builder.getUpdatedProjectGraph();
    expect(graph.dependencies).toEqual({
      source: [
        {
          source: 'source',
          target: 'target',
          type: 'static',
        },
      ],
      target: [],
    });
  });

  it(`should use both deps when both implicit and explicit deps are available`, () => {
    // don't include duplicates
    builder.addImplicitDependency('source', 'target');
    builder.addStaticDependency('source', 'target', 'source/index.ts');

    const graph = builder.getUpdatedProjectGraph();
    expect(graph.dependencies).toEqual({
      source: [
        {
          source: 'source',
          target: 'target',
          type: 'implicit',
        },
        {
          source: 'source',
          target: 'target',
          type: 'static',
        },
      ],
      target: [],
    });
  });

  it(`should record deps for all files when duplicated`, () => {
    builder.addStaticDependency('source', 'target', 'source/index.ts');
    builder.addStaticDependency('source', 'target', 'source/second.ts');

    const graph = builder.getUpdatedProjectGraph();
    expect(graph.dependencies).toEqual({
      source: [
        {
          source: 'source',
          target: 'target',
          type: 'static',
        },
      ],
      target: [],
    });
    expect(graph.nodes.source.data.files[0]).toMatchObject({
      file: 'source/index.ts',
      dependencies: [
        {
          source: 'source',
          target: 'target',
          type: 'static',
        },
      ],
    });
    expect(graph.nodes.source.data.files[1]).toMatchObject({
      file: 'source/second.ts',
      dependencies: [
        {
          source: 'source',
          target: 'target',
          type: 'static',
        },
      ],
    });
  });

  it(`remove dependency`, () => {
    builder.addNode({
      name: 'target2',
      type: 'lib',
      data: {} as any,
    });
    builder.addImplicitDependency('source', 'target');
    builder.addStaticDependency('source', 'target', 'source/index.ts');
    builder.addImplicitDependency('source', 'target2');
    builder.removeDependency('source', 'target');

    const graph = builder.getUpdatedProjectGraph();
    expect(graph.dependencies).toEqual({
      source: [
        {
          source: 'source',
          target: 'target2',
          type: 'implicit',
        },
      ],
      target: [],
      target2: [],
    });
  });

  it('should prune dependencies when removing explicit dependencies from the files', () => {
    builder.addImplicitDependency('source', 'target');
    builder.addExternalNode({
      name: 'npm:external',
      type: 'npm',
      data: {
        version: '1.0.0',
        packageName: 'external',
      },
    });
    builder.addExternalNode({
      name: 'npm:external2',
      type: 'npm',
      data: {
        version: '1.0.0',
        packageName: 'external2',
      },
    });
    builder.addStaticDependency('npm:external', 'npm:external2');
    builder.addStaticDependency('source', 'npm:external', 'source/index.ts');
    builder.addDynamicDependency('source', 'npm:external2', 'source/second.ts');
    const graph = builder.getUpdatedProjectGraph();

    expect(graph.dependencies).toMatchInlineSnapshot(`
      {
        "npm:external": [
          {
            "source": "npm:external",
            "target": "npm:external2",
            "type": "static",
          },
        ],
        "source": [
          {
            "source": "source",
            "target": "target",
            "type": "implicit",
          },
          {
            "source": "source",
            "target": "npm:external",
            "type": "static",
          },
          {
            "source": "source",
            "target": "npm:external2",
            "type": "dynamic",
          },
        ],
        "target": [],
      }
    `);
    expect(graph.nodes['source'].data.files).toMatchInlineSnapshot(`
      [
        {
          "dependencies": [
            {
              "source": "source",
              "target": "npm:external",
              "type": "static",
            },
          ],
          "file": "source/index.ts",
        },
        {
          "dependencies": [
            {
              "source": "source",
              "target": "npm:external2",
              "type": "dynamic",
            },
          ],
          "file": "source/second.ts",
        },
      ]
    `);

    const newBuilder = new ProjectGraphBuilder(graph);
    // remove static dependency from the file
    delete newBuilder.graph.nodes['source'].data.files[0].dependencies;

    const updatedGraph = newBuilder.getUpdatedProjectGraph();

    expect(updatedGraph.dependencies).toMatchInlineSnapshot(`
      {
        "npm:external": [
          {
            "source": "npm:external",
            "target": "npm:external2",
            "type": "static",
          },
        ],
        "source": [
          {
            "source": "source",
            "target": "target",
            "type": "implicit",
          },
          {
            "source": "source",
            "target": "npm:external2",
            "type": "dynamic",
          },
        ],
        "target": [],
      }
    `);
  });
});
