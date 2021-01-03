/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as assert from 'assert'
import * as os from 'os'
import * as path from 'path'
import * as ts from 'typescript-lsif'
import { Vertex, Edge, Id, Element } from 'lsif-protocol'
import { lsif as _lsif, Options as LSIFOptions } from './lsif'
import { Emitter } from './emitter'
import { ImportLinker } from './linker'

export class InMemoryLanguageServiceHost implements ts.LanguageServiceHost {
  private directories: Set<string>
  private scriptSnapshots: Map<string, ts.IScriptSnapshot | null>

  constructor(
    private cwd: string,
    private scripts: Map<string, string>,
    private options: ts.CompilerOptions
  ) {
    this.directories = new Set()
    this.scriptSnapshots = new Map<string, ts.IScriptSnapshot | null>()
    for (const item of scripts.keys()) {
      this.directories.add(path.dirname(item))
    }
  }

  public getScriptFileNames(): string[] {
    return [...this.scripts.keys()]
  }

  public getCompilationSettings(): ts.CompilerOptions {
    return this.options
  }

  public getScriptVersion(_fileName: string): string {
    return '0'
  }

  public getProjectVersion(): string {
    return '0'
  }

  public getScriptSnapshot(fileName: string): ts.IScriptSnapshot | undefined {
    let result:
      | ts.IScriptSnapshot
      | undefined
      | null = this.scriptSnapshots.get(fileName)
    if (result !== undefined && result !== null) {
      return result
    }
    if (result === null) {
      return undefined
    }
    let content: string | undefined
    if (fileName.startsWith('/@test/')) {
      content = this.scripts.get(fileName)
    } else {
      content = ts.sys.readFile(fileName)
    }
    if (content === undefined) {
      this.scriptSnapshots.set(fileName, null)
      return undefined
    }
    result = ts.ScriptSnapshot.fromString(content)
    this.scriptSnapshots.set(fileName, result)
    return result
  }

  public getCurrentDirectory(): string {
    return this.cwd
  }

  public getDefaultLibFileName(options: ts.CompilerOptions): string {
    const result = ts.getDefaultLibFilePath(options)
    return result
  }

  public directoryExists(path: string): boolean {
    if (path.startsWith('/@test')) {
      return this.directories.has(path)
    }
    return ts.sys.directoryExists(path)
  }

  public getDirectories(path: string): string[] {
    const result = ts.sys.getDirectories(path)
    return result
  }

  public fileExists(path: string): boolean {
    const result = ts.sys.fileExists(path)
    return result
  }

  public readFile(path: string, encoding?: string): string | undefined {
    const result = ts.sys.readFile(path, encoding)
    return result
  }

  public readDirectory(
    path: string,
    extensions?: readonly string[],
    exclude?: readonly string[],
    include?: readonly string[],
    depth?: number
  ): string[] {
    const result = ts.sys.readDirectory(
      path,
      extensions,
      exclude,
      include,
      depth
    )
    return result
  }
}

class TestEmitter implements Emitter {
  private sequence: Element[]
  private _lastId: Id
  public elements: Map<Id, Element>

  constructor() {
    this._lastId = -1
    this.sequence = []
    this.elements = new Map<Id, Element>()
  }

  public get lastId(): Id {
    return this._lastId
  }

  public emit(element: Vertex | Edge): void {
    this.sequence.push(element)
    assert.ok(!this.elements.has(element.id))
    this.elements.set(element.id, element)
    this._lastId = element.id
  }

  public toString(): string {
    const buffer: string[] = []
    for (const element of this.sequence) {
      buffer.push(JSON.stringify(element, undefined, 0))
    }
    return buffer.join(os.EOL)
  }
}

export function lsif(
  cwd: string,
  scripts: Map<string, string>,
  options: ts.CompilerOptions
): TestEmitter {
  const emitter = new TestEmitter()
  const host = new InMemoryLanguageServiceHost(cwd, scripts, options)
  const languageService = ts.createLanguageService(host)
  let counter = 1
  const idGenerator = (): number => counter++
  // const builder = new Builder({ idGenerator, emitSource: false })

  /*   const emitterContext: EmitterContext = {
    get edge() {
      return builder.edge
    },
    get vertex() {
      return builder.vertex
    },
    emit(element: Vertex | Edge): void {
      emitter.emit(element)
    },
  }
 */
  // const project = builder.vertex.project()
  /* const group = builder.vertex.group(
    URI.from({ scheme: 'lsif-test', path: cwd }).toString(),
    cwd,
    URI.from({ scheme: 'lsif-test', path: cwd }).toString()
  ) */
  // emitterContext.emit(group)
  const lsifOptions: LSIFOptions = {
    // stdout: true,

    // groupRoot: cwd,
    // projectName: cwd,
    projectRoot: cwd,
    repositoryRoot: cwd,
    addContents: true,
    // group: group,
    // tsConfigFile: undefined,

    // reporter,
    // dataMode: DataMode.free,
  }
  // const dataManager: DataManager = new DataManager(emitterContext, project)
  const importLinker: ImportLinker = new ImportLinker(
    lsifOptions.projectRoot,
    emitter,
    idGenerator
  )
  _lsif(
    languageService,
    lsifOptions,
    [],
    emitter,
    idGenerator,
    importLinker,
    undefined,
    undefined
  )
  return emitter
}
