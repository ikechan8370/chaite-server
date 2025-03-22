import {AbstractShareable, DeSerializable, Serializable, Wait} from './cloud'
import {BaseClientOptions} from './common'
import {ClientType} from "./adapter";
import {CHANNEL_STATUS_MAP} from "../const";

/**
 * 渠道
 * 每个渠道对应一个adapter，并记录客户端的options
 */
export class Channel extends AbstractShareable<Channel> implements Wait {
  constructor(params: Partial<Channel>) {
    super(params)
    this.modelType = 'settings'
    this.models = params.models || []
    if (params.adapterType) {
      this.adapterType = params.adapterType
    }
    if (params.options) {
      this.options = new BaseClientOptions().fromString(JSON.stringify(params.options))
    }
    this.weight = params.weight || 1
    this.priority = params.priority || 1
    this.status = params.status || 'enabled'
    this.disabledReason = params.disabledReason
    this.statistics = params.statistics || new ChannelStatistics()
    this.init()
  }

  async init() {
    if (this.options) {
      return this.options.ready()
    }
  }

  async ready(): Promise<void> {
    await this.init()
  }

  adapterType: ClientType
  options: BaseClientOptions
  models: string[]
  type: ClientType
  weight: number
  priority: number
  status: 'enabled' | 'disabled'
  disabledReason?: string
  statistics: ChannelStatistics

  fromString(str: string): Channel {
    const channel = JSON.parse(str)
    return new Channel(channel)
  }

  toString(): string {
    const toJsonStr = {
      id: this.id,
      models: this.models,
      adapterType: this.adapterType,
      options: this.options.toString(),
      name: this.name,
      type: this.type,
      weight: this.weight,
      statistics: this.statistics.toString(),
      status: this.status,
      priority: this.priority,
      disabledReason: this.disabledReason,
    }
    return JSON.stringify(toJsonStr)
  }

  toFormatedString(verbose: boolean = false): string {
    let base = `渠道ID：${this.id}\n渠道名称：${this.name}`

    if (this.adapterType) {
      base += `\n渠道类型：${this.adapterType}`
    }

    if (this.status) {
      base += `\n渠道状态：${CHANNEL_STATUS_MAP[this.status]}`
    }

    if (this.weight) {
      base += `\n渠道权重：${this.weight}`
    }

    if (this.priority) {
      base += `\n渠道优先级：${this.priority}`
    }

    if (this.disabledReason) {
      base += `\n渠道禁用原因：${this.disabledReason}`
    }

    if (this.models && this.models.length > 0) {
      base += `\n支持模型：${this.models.join(', ')}`
    }

    if (verbose) {
      if (this.options?.baseUrl) {
        base += `\nBaseURL: ${this.options.baseUrl}`
      }

      if (this.options?.apiKey) {
        const apiKeyStr = Array.isArray(this.options.apiKey) ? this.options.apiKey.join(',') : this.options.apiKey
        if (apiKeyStr) {
          base += `\nAPI Key：${apiKeyStr}`
        }
      }
    }

    if (this.createdAt) {
      base += `\n创建时间：${this.createdAt}`
    }

    if (this.updatedAt) {
      base += `\n最后更新时间：${this.updatedAt}`
    }

    if (this.uploader?.username) {
      base += `\n上传者：@${this.uploader.username}`
    }

    return base.trimEnd()
  }
}

export class ChannelStatistics implements Serializable, DeSerializable<ChannelStatistics> {
  callTimes?: number
  useToken?: number
  perModel: Record<string, Omit<ChannelStatistics, 'perModel'>>

  fromString(str: string): ChannelStatistics {
    const channel = JSON.parse(str) as ChannelStatistics
    this.callTimes = channel.callTimes
    this.useToken = channel.useToken
    this.perModel = channel.perModel
    return this
  }

  toString(): string {
    return JSON.stringify(this)
  }
}


export interface ChannelsLoadBalancer {
  getChannel(model: string, channels: Channel[]): Promise<Channel | null>

  getChannels(model: string, channels: Channel[], totalQuantity: number): Promise<{
    channel: Channel;
    quantity: number
  }[]>
}

