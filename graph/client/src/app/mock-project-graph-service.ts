/* eslint-disable @nx/enforce-module-boundaries */
// nx-ignore-next-line
import type {
  DependencyType,
  ProjectGraphDependency,
  ProjectGraphProjectNode,
} from '@nx/devkit';
// nx-ignore-next-line
import type {
  ProjectGraphClientResponse,
  TaskGraphClientResponse,
} from 'nx/src/command-line/graph/graph';
/* eslint-enable @nx/enforce-module-boundaries */
import { ProjectGraphService } from '../app/interfaces';

export class MockProjectGraphService implements ProjectGraphService {
  private projectGraphsResponse: ProjectGraphClientResponse = {
    hash: '79054025255fb1a26e4bc422aef54eb4',
    layout: {
      appsDir: 'apps',
      libsDir: 'libs',
    },
    projects: [
      {
        name: 'existing-app-1',
        type: 'app',
        data: {
          root: 'apps/app1',
          tags: [],
          files: [
            {
              file: 'some/file.ts',
              hash: 'ecccd8481d2e5eae0e59928be1bc4c2d071729d7',
              dependencies: [
                {
                  target: 'existing-lib-1',
                  source: 'existing-app-1',
                  type: 'static' as DependencyType,
                },
              ],
            },
          ],
        },
      },
      {
        name: 'existing-lib-1',
        type: 'lib',
        data: {
          root: 'libs/lib1',
          tags: [],
          files: [],
        },
      },
    ],
    dependencies: {
      'existing-app-1': [
        {
          source: 'existing-app-1',
          target: 'existing-lib-1',
          type: 'static',
        },
      ],
      'existing-lib-1': [],
    },
    affected: [],
    focus: null,
    exclude: [],
    groupByFolder: false,
  };

  private taskGraphsResponse: TaskGraphClientResponse = {
    taskGraphs: {},
    errors: {},
  };

  constructor(updateFrequency: number = 5000) {
    setInterval(() => this.updateResponse(), updateFrequency);
  }

  async getHash(): Promise<string> {
    return new Promise((resolve) => resolve(this.projectGraphsResponse.hash));
  }

  getProjectGraph(url: string): Promise<ProjectGraphClientResponse> {
    return new Promise((resolve) => resolve(this.projectGraphsResponse));
  }

  getTaskGraph(url: string): Promise<TaskGraphClientResponse> {
    return new Promise((resolve) => resolve(this.taskGraphsResponse));
  }

  private createNewProject(): ProjectGraphProjectNode {
    const type = Math.random() > 0.25 ? 'lib' : 'app';
    const name = `${type}-${this.projectGraphsResponse.projects.length + 1}`;

    return {
      name,
      type,
      data: {
        root: type === 'app' ? `apps/${name}` : `libs/${name}`,
        tags: [],
        files: [],
      },
    };
  }

  private updateResponse() {
    const newProject = this.createNewProject();
    const libProjects = this.projectGraphsResponse.projects.filter(
      (project) => project.type === 'lib'
    );

    const targetDependency =
      libProjects[Math.floor(Math.random() * libProjects.length)];
    const newDependency: ProjectGraphDependency[] = [
      {
        source: newProject.name,
        target: targetDependency.name,
        type: 'static',
      },
    ];

    this.projectGraphsResponse = {
      ...this.projectGraphsResponse,
      projects: [...this.projectGraphsResponse.projects, newProject],
      dependencies: {
        ...this.projectGraphsResponse.dependencies,
        [newProject.name]: newDependency,
      },
    };
  }
}
